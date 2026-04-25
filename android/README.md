# Android APKs (3 apps)

Este projeto Android gera 3 APKs separados:

- `garcom` -> abre `/garcom`
- `caixa` -> abre `/caixa`
- `churrasco` -> abre `/churrasqueiro`

## 1) Configurar URL do seu site

Edite `app/src/main/res/values/strings.xml`:

```xml
<string name="base_url">https://SEU-DOMINIO-AQUI.com</string>
```

Use a URL publicada (deploy), sem barra final.

## 2) Gerar wrapper Gradle (uma vez)

Se o repositório ainda nao tiver `gradlew`, rode dentro da pasta `android`:

```bash
gradle wrapper
```

Depois confirme no Git:

- `android/gradlew`
- `android/gradlew.bat`
- `android/gradle/wrapper/*`

## 3) Build local dos APKs

Dentro de `android`:

```bash
./gradlew app:assembleGarcomRelease
./gradlew app:assembleCaixaRelease
./gradlew app:assembleChurrascoRelease
```

No Windows PowerShell:

```powershell
.\gradlew.bat app:assembleGarcomRelease
.\gradlew.bat app:assembleCaixaRelease
.\gradlew.bat app:assembleChurrascoRelease
```

Saida:

- `app/build/outputs/apk/garcom/release/*.apk`
- `app/build/outputs/apk/caixa/release/*.apk`
- `app/build/outputs/apk/churrasco/release/*.apk`

## 4) Build no GitHub Actions

Workflow pronto em:

- `.github/workflows/android-apk.yml`

Ele gera os 3 APKs e publica como artifacts:

- `apk-garcom-release`
- `apk-caixa-release`
- `apk-churrasco-release`

## Impressao termica

A bridge `AndroidPrinter` ja esta integrada e expoe:

- `printOrder(payloadJson)`
- `printBill(payloadJson)`

Com:

- Socket TCP porta `9100`
- descoberta automatica de impressora na rede local
- deduplicacao de impressao
