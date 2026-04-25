plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.cardapio.apps"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.cardapio.apps"
    minSdk = 24
    targetSdk = 35
    versionCode = 1
    versionName = "1.0.0"

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro",
      )
    }
    debug {
      applicationIdSuffix = ".debug"
    }
  }

  flavorDimensions += "appType"
  productFlavors {
    create("garcom") {
      dimension = "appType"
      applicationIdSuffix = ".garcom"
      versionNameSuffix = "-garcom"
      buildConfigField("String", "START_PATH", "\"/garcom\"")
      buildConfigField("String", "APP_ROLE", "\"garcom\"")
    }
    create("caixa") {
      dimension = "appType"
      applicationIdSuffix = ".caixa"
      versionNameSuffix = "-caixa"
      buildConfigField("String", "START_PATH", "\"/caixa\"")
      buildConfigField("String", "APP_ROLE", "\"caixa\"")
    }
    create("churrasco") {
      dimension = "appType"
      applicationIdSuffix = ".churrasco"
      versionNameSuffix = "-churrasco"
      buildConfigField("String", "START_PATH", "\"/churrasqueiro\"")
      buildConfigField("String", "APP_ROLE", "\"churrasco\"")
    }
  }

  buildFeatures {
    buildConfig = true
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions {
    jvmTarget = "17"
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("com.google.android.material:material:1.12.0")
  implementation("androidx.webkit:webkit:1.12.1")
}
