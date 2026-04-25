package com.cardapio.print;

import java.util.ArrayList;
import java.util.List;

public final class PedidoModels {
  private PedidoModels() {}

  public static class Pedido {
    public String pedidoId;
    public int mesa;
    public String garcom;
    public String observacoes;
    public String criadoEmIso;
    public List<ItemPedido> itens = new ArrayList<>();

    public Pedido(
        String pedidoId,
        int mesa,
        String garcom,
        String observacoes,
        String criadoEmIso,
        List<ItemPedido> itens) {
      this.pedidoId = pedidoId;
      this.mesa = mesa;
      this.garcom = garcom;
      this.observacoes = observacoes;
      this.criadoEmIso = criadoEmIso;
      if (itens != null) {
        this.itens = itens;
      }
    }
  }

  public static class ItemPedido {
    public String nome;
    public int quantidade;
    public String observacao;

    public ItemPedido(String nome, int quantidade, String observacao) {
      this.nome = nome;
      this.quantidade = quantidade;
      this.observacao = observacao;
    }
  }
}
