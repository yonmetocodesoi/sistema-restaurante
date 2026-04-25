package com.cardapio.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.cardapio.apps.BuildConfig
import com.cardapio.apps.R

class MainActivity : AppCompatActivity() {
  private lateinit var webView: WebView

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
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
  }

  override fun onBackPressed() {
    if (::webView.isInitialized && webView.canGoBack()) {
      webView.goBack()
      return
    }
    super.onBackPressed()
  }
}
