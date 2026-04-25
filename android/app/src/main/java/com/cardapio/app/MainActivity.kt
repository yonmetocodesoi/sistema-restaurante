package com.cardapio.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.Gravity
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.cardapio.apps.BuildConfig
import com.cardapio.apps.R

class MainActivity : AppCompatActivity() {
  private lateinit var webView: WebView

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    try {
      setContentView(R.layout.activity_main)

      webView = findViewById(R.id.webView)
      webView.settings.javaScriptEnabled = true
      webView.settings.domStorageEnabled = true
      webView.settings.databaseEnabled = true
      webView.settings.useWideViewPort = true
      webView.settings.loadWithOverviewMode = true
      webView.settings.setSupportZoom(false)

      webView.webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
          return false
        }
      }
      webView.webChromeClient = WebChromeClient()

      webView.addJavascriptInterface(WebAppBridge(this), "AndroidPrinter")
      webView.loadUrl("${getString(R.string.base_url)}${BuildConfig.START_PATH}")
    } catch (t: Throwable) {
      showStartupError(t)
    }
  }

  override fun onBackPressed() {
    if (::webView.isInitialized && webView.canGoBack()) {
      webView.goBack()
      return
    }
    super.onBackPressed()
  }

  private fun showStartupError(t: Throwable) {
    val msg = buildString {
      append("Falha ao iniciar o app.\n\n")
      append("Detalhe: ")
      append(t.javaClass.simpleName)
      if (!t.message.isNullOrBlank()) {
        append(" - ")
        append(t.message)
      }
      append("\n\nVerifique se o Android System WebView/Chrome esta atualizado.")
    }
    val tv = TextView(this).apply {
      text = msg
      setPadding(48, 48, 48, 48)
      gravity = Gravity.CENTER
      textSize = 14f
    }
    setContentView(tv)
  }
}
