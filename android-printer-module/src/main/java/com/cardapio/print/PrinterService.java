package com.cardapio.print;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class PrinterService {
  public interface DiscoveryCallback {
    void onFound(List<String> ips);
    void onError(String message);
  }

  public interface Callback {
    void onSuccess();
    void onError(String message, boolean semPapel);
  }

  private static final int PORT = 9100;
  private static final int TIMEOUT_MS = 5000;
  private static final int DISCOVERY_CONNECT_TIMEOUT_MS = 250;
  private static final int DEDUP_WINDOW_MS = 120_000;
  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private final Map<String, Long> recentPrints =
      Collections.synchronizedMap(
          new LinkedHashMap<String, Long>(200, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Long> eldest) {
              return size() > 500;
            }
          });

  public void discoverPrintersAsync(DiscoveryCallback callback) {
    executor.execute(
        () -> {
          try {
            List<String> printers = discoverPrintersInLocalSubnet();
            if (callback != null) callback.onFound(printers);
          } catch (Exception ex) {
            if (callback != null) callback.onError("Falha ao buscar impressoras na rede local.");
          }
        });
  }

  public void printPedidoAsync(String ip, PedidoModels.Pedido pedido, int paperWidthMm, Callback callback) {
    String conteudo = PedidoFormatter.format(pedido, paperWidthMm);
    executor.execute(
        () -> {
          try {
            String signature = buildPedidoSignature(pedido);
            if (isDuplicate(signature)) {
              if (callback != null) callback.onError("Pedido ja impresso recentemente. Evitado duplicado.", false);
              return;
            }
            String destino = resolvePrinterIp(ip);
            if (destino == null || destino.isBlank()) {
              if (callback != null) callback.onError("Nenhuma impressora encontrada na rede local.", false);
              return;
            }
            printPedido(destino, pedido.mesa, conteudo);
            markPrinted(signature);
            if (callback != null) callback.onSuccess();
          } catch (IOException ex) {
            String msg = mapFriendlyError(ex);
            boolean semPapel = isNoPaper(ex);
            if (callback != null) callback.onError(msg, semPapel);
          } catch (Exception ex) {
            if (callback != null) callback.onError("Falha inesperada ao imprimir.", false);
          }
        });
  }

  public void printAsync(String ip, String conteudo, Callback callback) {
    executor.execute(
        () -> {
          try {
            printTexto(ip, conteudo);
            if (callback != null) callback.onSuccess();
          } catch (IOException ex) {
            String msg = mapFriendlyError(ex);
            boolean semPapel = isNoPaper(ex);
            if (callback != null) callback.onError(msg, semPapel);
          } catch (Exception ex) {
            if (callback != null) callback.onError("Falha inesperada ao imprimir.", false);
          }
        });
  }

  public void shutdown() {
    executor.shutdown();
  }

  private void printPedido(String ip, int mesa, String conteudo) throws IOException {
    try (Socket socket = new Socket()) {
      socket.connect(new InetSocketAddress(ip, PORT), TIMEOUT_MS);
      socket.setSoTimeout(TIMEOUT_MS);
      try (OutputStream out = socket.getOutputStream()) {
        out.write(escPosInit());
        out.write(escPosBoldOn());
        out.write("NOVO PEDIDO\n".getBytes(StandardCharsets.UTF_8));
        out.write(escPosBoldOff());
        out.write(escPosDoubleHeightOn());
        out.write(("MESA " + mesa + "\n").getBytes(StandardCharsets.UTF_8));
        out.write(escPosDoubleHeightOff());
        out.write(conteudo.getBytes(StandardCharsets.UTF_8));
        out.write(feed(4));
        out.write(fullCut());
        out.flush();
      }
    }
  }

  private String resolvePrinterIp(String providedIp) {
    if (providedIp != null && !providedIp.isBlank()) return providedIp.trim();
    List<String> discovered = discoverPrintersInLocalSubnet();
    return discovered.isEmpty() ? null : discovered.get(0);
  }

  private List<String> discoverPrintersInLocalSubnet() {
    String localIp = getDeviceIpv4();
    if (localIp == null || localIp.isBlank()) return Collections.emptyList();

    String prefix = localIp.substring(0, localIp.lastIndexOf('.') + 1);
    List<String> found = Collections.synchronizedList(new ArrayList<>());
    int workers = 32;
    ExecutorService pool = Executors.newFixedThreadPool(workers);
    CountDownLatch latch = new CountDownLatch(254);

    for (int i = 1; i <= 254; i++) {
      final String candidate = prefix + i;
      pool.execute(
          () -> {
            try (Socket socket = new Socket()) {
              socket.connect(new InetSocketAddress(candidate, PORT), DISCOVERY_CONNECT_TIMEOUT_MS);
              found.add(candidate);
            } catch (IOException ignored) {
            } finally {
              latch.countDown();
            }
          });
    }

    try {
      latch.await(20, TimeUnit.SECONDS);
    } catch (InterruptedException ignored) {
      Thread.currentThread().interrupt();
    }
    pool.shutdownNow();
    found.sort(Comparator.naturalOrder());
    return found;
  }

  private String getDeviceIpv4() {
    try {
      Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
      while (interfaces.hasMoreElements()) {
        NetworkInterface ni = interfaces.nextElement();
        if (!ni.isUp() || ni.isLoopback()) continue;
        Enumeration<InetAddress> addresses = ni.getInetAddresses();
        while (addresses.hasMoreElements()) {
          InetAddress addr = addresses.nextElement();
          String host = addr.getHostAddress();
          if (host != null
              && host.indexOf(':') < 0
              && !host.startsWith("127.")
              && !host.startsWith("169.254.")) {
            return host;
          }
        }
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  private String buildPedidoSignature(PedidoModels.Pedido pedido) {
    StringBuilder raw = new StringBuilder();
    raw.append("mesa=").append(pedido.mesa).append("|");
    raw.append("pedidoId=").append(safe(pedido.pedidoId)).append("|");
    raw.append("garcom=").append(safe(pedido.garcom)).append("|");
    raw.append("obs=").append(safe(pedido.observacoes)).append("|");
    if (pedido.itens != null) {
      List<PedidoModels.ItemPedido> ordered = new ArrayList<>(pedido.itens);
      ordered.sort(Comparator.comparing(i -> safe(i.nome)));
      for (PedidoModels.ItemPedido item : ordered) {
        raw.append(safe(item.nome))
            .append("#")
            .append(item.quantidade)
            .append("#")
            .append(safe(item.observacao))
            .append("|");
      }
    }
    return sha256(raw.toString());
  }

  private boolean isDuplicate(String signature) {
    cleanupOldSignatures();
    Long previous = recentPrints.get(signature);
    if (previous == null) return false;
    return (System.currentTimeMillis() - previous) < DEDUP_WINDOW_MS;
  }

  private void markPrinted(String signature) {
    recentPrints.put(signature, System.currentTimeMillis());
  }

  private void cleanupOldSignatures() {
    long now = System.currentTimeMillis();
    List<String> toRemove = new ArrayList<>();
    for (Map.Entry<String, Long> entry : recentPrints.entrySet()) {
      if ((now - entry.getValue()) >= DEDUP_WINDOW_MS) {
        toRemove.add(entry.getKey());
      }
    }
    for (String key : toRemove) {
      recentPrints.remove(key);
    }
  }

  private String sha256(String value) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte b : digest) {
        sb.append(String.format("%02x", b));
      }
      return sb.toString();
    } catch (Exception ex) {
      return value;
    }
  }

  private String safe(String s) {
    return s == null ? "" : s.trim();
  }

  private void printTexto(String ip, String conteudo) throws IOException {
    try (Socket socket = new Socket()) {
      socket.connect(new InetSocketAddress(ip, PORT), TIMEOUT_MS);
      socket.setSoTimeout(TIMEOUT_MS);
      try (OutputStream out = socket.getOutputStream()) {
        out.write(escPosInit());
        out.write(conteudo.getBytes(StandardCharsets.UTF_8));
        out.write(feed(4));
        out.write(fullCut());
        out.flush();
      }
    }
  }

  private String mapFriendlyError(Exception ex) {
    if (isNoPaper(ex)) {
      return "Impressora sem papel. Marque como SemPapel e continue.";
    }
    String msg = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
    if (msg.contains("timed out") || msg.contains("timeout")) {
      return "Impressora offline ou sem resposta na rede.";
    }
    if (msg.contains("refused") || msg.contains("unreachable")) {
      return "Nao foi possivel conectar na impressora. Verifique IP e rede.";
    }
    return "Nao foi possivel imprimir agora. Tente novamente.";
  }

  private boolean isNoPaper(Exception ex) {
    String msg = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
    return msg.contains("paper") || msg.contains("sem papel");
  }

  private byte[] escPosInit() {
    return new byte[] {0x1B, 0x40};
  }

  private byte[] escPosBoldOn() {
    return new byte[] {0x1B, 0x45, 0x01};
  }

  private byte[] escPosBoldOff() {
    return new byte[] {0x1B, 0x45, 0x00};
  }

  private byte[] escPosDoubleHeightOn() {
    return new byte[] {0x1D, 0x21, 0x11};
  }

  private byte[] escPosDoubleHeightOff() {
    return new byte[] {0x1D, 0x21, 0x00};
  }

  private byte[] feed(int n) {
    return new byte[] {0x1B, 0x64, (byte) n};
  }

  private byte[] fullCut() {
    return new byte[] {0x1D, 0x56, 0x00};
  }
}
