package com.cardapio.print;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class PedidoFormatter {
  private PedidoFormatter() {}

  public static String format(PedidoModels.Pedido pedido, int paperWidthMm) {
    int lineWidth = paperWidthMm <= 58 ? 32 : 48;
    StringBuilder sb = new StringBuilder();
    sb.append(center("PEDIDO COZINHA", lineWidth)).append("\n");
    sb.append(repeat("-", lineWidth)).append("\n");
    sb.append("Mesa: ").append(pedido.mesa).append("\n");
    if (pedido.pedidoId != null && !pedido.pedidoId.isBlank()) {
      sb.append("Pedido: ").append(pedido.pedidoId.trim()).append("\n");
    }
    sb.append("Garcom: ").append(safe(pedido.garcom)).append("\n");
    sb.append("Hora: ").append(now(pedido)).append("\n");
    sb.append(repeat("-", lineWidth)).append("\n");

    for (PedidoModels.ItemPedido item : pedido.itens) {
      String qtdNome = item.quantidade + "x " + safe(item.nome);
      sb.append(fitRight(qtdNome, lineWidth)).append("\n");
      if (item.observacao != null && !item.observacao.isBlank()) {
        sb.append("  Obs: ").append(item.observacao.trim()).append("\n");
      }
    }

    if (pedido.observacoes != null && !pedido.observacoes.isBlank()) {
      sb.append(repeat("-", lineWidth)).append("\n");
      sb.append("Obs Geral: ").append(pedido.observacoes.trim()).append("\n");
    }

    sb.append(repeat("-", lineWidth)).append("\n");
    sb.append(center("Bom trabalho!", lineWidth)).append("\n\n");
    return sb.toString();
  }

  private static String safe(String s) {
    return s == null ? "" : s.trim();
  }

  private static String repeat(String s, int count) {
    return s.repeat(Math.max(0, count));
  }

  private static String center(String text, int width) {
    String t = safe(text);
    if (t.length() >= width) return t;
    int left = (width - t.length()) / 2;
    return " ".repeat(Math.max(0, left)) + t;
  }

  private static String fitRight(String text, int width) {
    String t = safe(text);
    if (t.length() <= width) return t;
    return t.substring(0, width);
  }

  private static String now(PedidoModels.Pedido pedido) {
    if (pedido != null && pedido.criadoEmIso != null && !pedido.criadoEmIso.isBlank()) {
      return pedido.criadoEmIso.trim();
    }
    return new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(new Date());
  }
}
