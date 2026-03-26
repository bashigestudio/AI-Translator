# Bashige Translate (Ad Edition)

**Bashige Translate** is a lightweight Windows desktop translator designed around four core principles:

- **Simple**: clean 4:3 UI, minimal controls, no clutter
- **Efficient**: paste → translate → stream → copy, optimized for fast iteration
- **AI-smart**: streaming output, mode control, and automatic source-language detection
- **Single-file**: ship a **portable EXE** (no installer required)

## Features

- **Streaming translation**: see output as it’s generated
- **Translation modes**:
  - **Faithful**: more literal/precise
  - **Balanced**: default
  - **Idiomatic**: more localized, native phrasing
- **Auto-detect source language**
- **One-click Paste / Copy**
- **Cancel request** support
- **Basic stats**: latency + input/output character counts
- **Safety-focused defaults**:
  - Base URL restricted to **`https://`** and blocks `localhost` / private IPs
  - API key is **not saved by default** (optional **Remember** toggle)

## Portable EXE (Single-file)

After building, the portable executable is located at:

- `src-tauri/target/release/translator-app.exe`

This is the recommended artifact to upload to GitHub **Releases** for end users.

## Requirements

- Windows 10/11
- Microsoft Edge WebView2 Runtime

## Development

```bash
cd translator-app-ad
npm install
npm run tauri dev
```

## Build (Portable EXE)

Recommended for a single-file build (no installer/bundling):

```bash
cd translator-app-ad
npm run tauri -- build --no-bundle
```

## Configuration

This app talks to an **OpenAI-compatible** Chat Completions endpoint:

- **LLM Base URL**: e.g. `https://api.openai.com/v1`
- **API Key**: provider key (pasting `Bearer ...` is handled)
- **Model ID**: e.g. `gpt-4o-mini` (or your provider’s model name)
- **Target**: output language

## Ads / Affiliate Disclosure

This edition includes an **affiliate-style ad footer**:

- Marked with an **AD** badge
- Clicking the ad text opens your default browser to a third-party website:
  - `https://wavespeedai.pxf.io/QYO4Xz`

No third‑party ad scripts/iframes are embedded in the app UI.

## Privacy

- Text you translate is sent only to the LLM provider configured in **LLM Base URL**
- No intentional analytics/telemetry by default
- If you enable **Remember**, the API key is stored locally on your machine

## Troubleshooting

### HTTP 401 / Unauthorized

- Invalid/expired API key, or Base URL / model does not match your provider/key.

## License

Choose a license that matches your distribution needs (e.g. MIT / Apache-2.0).
