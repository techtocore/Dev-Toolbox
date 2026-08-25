# Dev Toolbox

**A privacy-first collection of developer utilities that run in your browser.** Tool inputs — from JSON and secrets to PDFs and images — are processed locally with no backend, accounts, uploads, or ads. The official hosted app collects basic page-usage telemetry; it never includes tool inputs.

🔗 **Live app:** https://techtocore.github.io/Dev-Toolbox/
📲 **Installable:** it's a PWA — install it to your home screen or desktop. Local tools work offline after the app is cached; network-dependent model downloads and public-IP lookup are clearly opt-in.

---

## 🛠️ Tools

### 🤖 AI & Machine Learning
- **Local AI (Chat)** — A small language model that runs fully on-device via WebGPU. No accounts, no servers — your conversation never leaves the browser. Hardware-aware model picker spanning **Qwen (Alibaba), Gemma (Google), Llama (Meta), and Phi (Microsoft)** — from a ~0.4 GB tiny model for phones up to larger models for capable GPUs — with one-time cached downloads and tunable generation settings.
- **Token Counter & Cost Estimator** — Estimate token counts and API costs across LLM providers.
- **Prompt Optimizer** — Score a prompt against best practices, then rewrite it with the on-device AI.
- **Prompt Template Builder** — Reusable prompt templates with variables.
- **JSON Schema Generator** — Build JSON schemas for structured LLM output, or describe your data and let the on-device AI draft the fields.

> **On-device AI Assist** is also embedded as an **optional, private co-pilot** inside several tools (collapsed by default, degrades gracefully without WebGPU): Prompt Optimizer, Regex Tester (English → pattern), SQL Query Builder (English → SQL), JSON Schema Generator, and Data Profiler. The model loads once and is shared across every tool.

### 🧩 Parsing & Formatting
- **JSON Formatter** — Validate and pretty-print JSON with a collapsible tree view.
- **JSON to TypeScript** — Generate TypeScript interfaces (or type aliases) from a JSON sample; nested objects and arrays of objects are merged into clean, optional-aware types.
- **Timestamp Converter** — Convert between Unix timestamps, ISO 8601, and human-readable formats.

### 🔐 Encoding & Security
- **Base64 Encode/Decode** — Convert text to/from Base64.
- **Hash Generator** — MD5, SHA-1, SHA-256, SHA-512 (and keyed HMAC).
- **JWT Decoder** — Decode and inspect JWT header, payload, and signature.
- **URL Encode/Decode** — Encode/decode URL components and strings.
- **Certificate Information** — Extract and view X.509 certificate details.
- **Password & Passphrase Generator** — Cryptographically-strong passwords and memorable passphrases via the Web Crypto CSPRNG, with a live entropy/strength estimate. Never transmitted.

### 📊 Data Analysis
- **CSV/JSON Converter** — Convert between CSV/TSV and JSON (RFC-4180 quote-aware parsing).
- **Data Profiler** — Data-quality stats and patterns, with optional on-device AI insights.
- **SQL Query Builder** — Build queries visually, or describe them in plain English with on-device AI.
- **Numeric Summary** — Statistical analysis of numeric data (mean, median, mode, …).

### ✍️ Text Processing
- **Diff Checker** — Side-by-side difference highlighting.
- **Markdown Editor** — Live markdown preview and editing.
- **Word Counter** — Words, characters, lines, and more.
- **Case Converter** — Convert between `camelCase`, `snake_case`, `kebab-case`, `CONSTANT_CASE`, `Title Case`, slugs and more — identifier styles re-tokenize, prose styles keep your layout.

### 🧰 Development Tools
- **Regex Tester** — Live matching/highlighting, or generate a pattern from plain English (on-device AI).
- **UUID Generator** — Generate UUIDs (v4 and more) in bulk.
- **Number Base Converter** — Convert integers between binary, octal, decimal, hex and any base from 2–36; `BigInt`-backed so huge values stay exact.
- **Cron Expression Helper** — Explain a 5-field cron schedule (and `@daily`/`@hourly` nicknames) in plain English, expand each field, and preview the next run times.
- **Color Converter** — HEX ⇄ RGB ⇄ HSL ⇄ HSV ⇄ CMYK with a picker and a WCAG contrast check.
- **IP & Browser Info** — Your public IP, ISP, location, timezone, and browser/device details.
- **QR Code Generator** — QR codes from text, URLs, or Wi-Fi credentials; download as PNG or SVG.
- **Bulk QR Code Generator** — Generate a batch of collision-safe QR images and download them as a ZIP.
- **GZIP & Deflate Toolkit** — Compress and decompress text or files with GZIP, zlib, and raw DEFLATE formats.

### 📱 Device & Sensors
- **Bubble Level** — A spirit level driven by your device's motion sensor, with calibration and haptics.
- **Compass** — A magnetic compass with a live rotating rose.
- **Sound Level Meter** — Live microphone loudness meter with peak/average stats (works on desktop too).
- **Motion Lab** — Inspect live acceleration, rotation, orientation, and sampling data with recording and CSV export.
- **GPS Field Meter** — Measure position, altitude, speed, heading, accuracy, and distance travelled with a live session log.

### 📄 PDF Tools *(all in-browser via `pdf-lib` — files never uploaded)*
- **Merge PDF** — Combine multiple PDFs into one.
- **Split / Extract PDF** — Pull a page range into a new file.
- **Organize PDF** — Reorder, rotate, and delete pages.
- **Images to PDF** — Combine images into a PDF (A4 / Letter / fit-to-image).

### 🖼️ Image & Media *(canvas / EXIF — nothing uploaded)*
- **Image Resizer & Compressor** — Resize, compress, and convert (PNG / JPEG / WebP) with before/after sizes.
- **Batch Image Format Converter** — Convert up to 100 PNG, JPEG, WebP, GIF, or BMP files and download multi-file results as a ZIP; animated PNG/WebP/GIF inputs are identified before first-frame conversion.
- **Image Metadata Viewer & Stripper** — Inspect EXIF/GPS metadata and download a stripped, share-safe copy.
- **Image to Base64 Data URI** — Convert an image to a data URI (with CSS/HTML snippets) and back.

---

## 🔒 Privacy

Tool inputs are processed **entirely in the browser** — files, text, keys, images, and AI prompts are never uploaded to an application server. The official GitHub Pages deployment uses Google Analytics for basic page-view telemetry with Google Signals and ad-personalization signals disabled. Local and self-hosted copies do not load it.

Two features make explicit network requests: Local AI downloads model weights from the model host before inference runs on-device, and IP & Browser Info contacts a public IP service only after consent. Those tools explain the request before it happens; the rest of the toolbox works locally and can be used offline once the PWA assets are cached.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js `^22.22.3 || ^24.15.0 || >=26`** (required by Angular 22 — Node 24 LTS recommended) and a recent **npm**.
- For **Local AI**: a WebGPU-capable browser (recent Chrome/Edge on desktop, or Safari 18+).

### Installation

```bash
git clone https://github.com/techtocore/Dev-Toolbox.git
cd Dev-Toolbox
npm install
```

### Development server

```bash
npm start
```

Navigate to `http://localhost:4200/`. The app reloads automatically on source changes.

### Production build

```bash
npm run build
```

Artifacts are emitted to `dist/dev-toolbox/`. Production builds include the service worker (`ngsw-worker.js`) and web manifest, so the deployed app is installable and offline-capable.

### Other commands

```bash
npm run lint     # ESLint (flat config)
npm run typecheck # application and test TypeScript checks
npm run test:ci  # unit tests (Karma + Jasmine, headless Chrome)
npm run check    # lint + typecheck + tests + production audit + build
```

> **Testing the PWA locally:** service workers require a production build served over HTTP(S), not `ng serve`. Build, then serve `dist/dev-toolbox/browser/` with any static server (e.g. `npx http-server dist/dev-toolbox/browser`).

---

## 📦 Tech Stack

- **Angular 22.1** — NgModule app using the modern control-flow syntax (`@if`, `@for`) and targeted ESM imports to keep the initial bundle lean.
- **TypeScript 6.0** — type-safe development (pinned `<6.1` to match Angular 22's build toolchain).
- **Angular Service Worker** — installable, offline-capable PWA.
- **Bootstrap 5.3** + **Bootstrap Icons** — responsive UI.
- **RxJS 7.8** · **Zone.js 0.16**.
- **ESLint 10** — flat config (`eslint.config.js`) with `angular-eslint` + `typescript-eslint`.
- **@mlc-ai/web-llm 0.2** — in-browser LLM inference over WebGPU (Web Worker backed, lazy-loaded).
- **pdf-lib**, **qrcode**, **exifr** — PDF/QR/EXIF tooling, dynamically imported so they stay in lazy chunks.
- **marked 18** (Markdown), **node-forge 1.4** (X.509), **crypto-js 4.2** (hashing/HMAC).

---

## 📄 License

This project is open source and available for use and modification.

## 👥 Contributors

<a href="https://github.com/techtocore/Dev-Toolbox/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=techtocore/Dev-Toolbox" />
</a>
