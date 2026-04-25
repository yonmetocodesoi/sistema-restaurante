# Modulo de Impressao Termica (Android/Java)

Implementacao para impressora termica via Socket TCP na porta `9100`, com ESC/POS e execucao em background.

## Arquivos

- `PedidoModels.java`: modelos de `Pedido` e `ItemPedido`.
- `PedidoFormatter.java`: converte pedido para texto alinhado em papel `80mm` ou `58mm`.
- `PrinterService.java`: envio TCP para impressora com callbacks de sucesso/erro.

## Recursos implementados

- Impressao em thread segura com `ExecutorService`.
- Titulo em negrito (ESC/POS).
- Numero da mesa em texto expandido (ESC/POS).
- Corte de papel ao final.
- Descoberta automatica de impressora na rede local (scan da sub-rede na porta `9100`).
- Protecao contra duplicidade de impressao (janela de 2 minutos por assinatura do pedido).
- Identificacao no cupom por `mesa + pedidoId`.
- Tratamento de erro amigavel:
  - impressora offline/rede
  - sem papel (`semPapel = true` no callback)

## Exemplo de uso

```java
PrinterService service = new PrinterService();

List<PedidoModels.ItemPedido> itens = new ArrayList<>();
itens.add(new PedidoModels.ItemPedido("Picanha", 1, "Ao ponto"));
itens.add(new PedidoModels.ItemPedido("Refrigerante", 2, ""));

PedidoModels.Pedido pedido =
    new PedidoModels.Pedido("M12-000045", 12, "G2", "Sem cebola", "25/04/2026 11:30", itens);

service.printPedidoAsync("192.168.0.120", pedido, 80, new PrinterService.Callback() {
  @Override
  public void onSuccess() {
    // Pedido impresso
  }

  @Override
  public void onError(String message, boolean semPapel) {
    // Exibir mensagem amigavel e opcao "SemPapel"
  }
});
```

Se nao souber o IP, envie vazio/`null` para o servico descobrir automaticamente:

```java
service.printPedidoAsync(null, pedido, 80, callback);
```

Ou descubra antes e escolha um IP da lista:

```java
service.discoverPrintersAsync(new PrinterService.DiscoveryCallback() {
  @Override
  public void onFound(List<String> ips) {
    // Ex.: mostrar ao operador ou salvar o primeiro IP encontrado
  }

  @Override
  public void onError(String message) {
    // Tratar erro de descoberta
  }
});
```

## Fluxo recomendado no botao Finalizar

1. Salvar pedido no banco.
2. Em paralelo, disparar `printPedidoAsync(...)`.
3. Se falhar por sem papel, notificar garcom e permitir continuar com status `SemPapel`.
