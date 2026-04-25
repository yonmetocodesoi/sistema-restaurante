package com.cardapio.app

import android.content.Context
import android.webkit.JavascriptInterface
import com.cardapio.print.PedidoModels
import com.cardapio.print.PrinterService
import org.json.JSONArray
import org.json.JSONObject

class WebAppBridge(private val context: Context) {
  private val printerService = PrinterService()

  @JavascriptInterface
  fun printOrder(payload: String) {
    val pedido = parsePedido(payload)
    printerService.printPedidoAsync(
      null,
      pedido,
      80,
      object : PrinterService.Callback {
        override fun onSuccess() {}
        override fun onError(message: String, semPapel: Boolean) {}
      },
    )
  }

  @JavascriptInterface
  fun printBill(payload: String) {
    // Mesmo fluxo de descoberta/roteamento de impressora.
    // Se quiser separar por impressora de caixa/cozinha, aplicamos regra por tipo aqui.
    val raw = JSONObject(payload)
    val mesa = raw.optInt("mesa", 0)
    val itens = mutableListOf<PedidoModels.ItemPedido>()
    val jsonItens = raw.optJSONArray("itens") ?: JSONArray()
    for (i in 0 until jsonItens.length()) {
      val item = jsonItens.optJSONObject(i) ?: continue
      val nome = item.optString("nome")
      val qtd = item.optInt("quantidade", 0)
      itens.add(PedidoModels.ItemPedido(nome, qtd, ""))
    }
    val pedido = PedidoModels.Pedido(
      "CONTA-M$mesa-${System.currentTimeMillis()}",
      mesa,
      "CAIXA",
      "Conta da mesa",
      raw.optString("fechadoEm", ""),
      itens,
    )
    printerService.printPedidoAsync(
      null,
      pedido,
      80,
      object : PrinterService.Callback {
        override fun onSuccess() {}
        override fun onError(message: String, semPapel: Boolean) {}
      },
    )
  }

  private fun parsePedido(payload: String): PedidoModels.Pedido {
    val raw = JSONObject(payload)
    val mesa = raw.optInt("mesa", 0)
    val garcom = raw.optString("garcom", "GARCOM")
    val observacoes = raw.optString("observacoes", "")
    val pedidoId = raw.optString("pedidoId", "M$mesa-${System.currentTimeMillis()}")
    val criadoEmIso = raw.optString("criadoEmIso", "")
    val itens = mutableListOf<PedidoModels.ItemPedido>()
    val jsonItens = raw.optJSONArray("itens") ?: JSONArray()
    for (i in 0 until jsonItens.length()) {
      val item = jsonItens.optJSONObject(i) ?: continue
      val nome = item.optString("nome")
      val qtd = item.optInt("quantidade", 0)
      val obs = item.optString("observacao", "")
      itens.add(PedidoModels.ItemPedido(nome, qtd, obs))
    }
    return PedidoModels.Pedido(pedidoId, mesa, garcom, observacoes, criadoEmIso, itens)
  }
}
