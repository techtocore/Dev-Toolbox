# Dev Toolbox

**A privacy-first collection of developer utilities that run 100% in your browser.** Every tool — from JSON formatting and hashing to PDF editing, image tools, device sensors, and an on-device AI — runs client-side. The files, text, and secrets you work with **never leave your device**. No backend, no accounts, no uploads.

🔗 **Live app:** https://techtocore.github.io/Dev-Toolbox/
📲 **Installable:** it's a PWA — install it to your home screen or desktop and use every tool **fully offline**.

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

### 🧰 Development Tools
- **Regex Tester** — Live matching/highlighting, or generate a pattern from plain English (on-device AI).
- **UUID Generator** — Generate UUIDs (v4 and more) in bulk.
- **Color Converter** — HEX ⇄ RGB ⇄ HSL ⇄ HSV ⇄ CMYK with a picker and a WCAG contrast check.
- **IP & Browser Info** — Your public IP, ISP, location, timezone, and browser/device details.
- **QR Code Generator** — QR codes from text, URLs, or Wi-Fi credentials; download as PNG or SVG.

### 📱 Device & Sensors
- **Bubble Level** — A spirit level driven by your device's motion sensor, with calibration and haptics.
- **Compass** — A magnetic compass with a live rotating rose.
- **Sound Level Meter** — Live microphone loudness meter with peak/average stats (works on desktop too).

### 📄 PDF Tools *(all in-browser via `pdf-lib` — files never uploaded)*
- **Merge PDF** — Combine multiple PDFs into one.
- **Split / Extract PDF** — Pull a page range into a new file.
- **Organize PDF** — Reorder, rotate, and delete pages.
- **Images to PDF** — Combine images into a PDF (A4 / Letter / fit-to-image).

### 🖼️ Image & Media *(canvas / EXIF — nothing uploaded)*
- **Image Resizer & Compressor** — Resize, compress, and convert (PNG / JPEG / WebP) with before/after sizes.
- **Image Metadata Viewer & Stripper** — Inspect EXIF/GPS metadata and download a stripped, share-safe copy.
- **Image to Base64 Data URI** — Convert an image to a data URI (with CSS/HTML snippets) and back.

---

## 🔒 Privacy

Every tool processes your data **entirely in the browser** — files, text, keys, and images are never uploaded to a server. The on-device AI runs locally over WebGPU; even your prompts stay on your machine.

The hosted version uses Google Analytics for anonymous, aggregate usage statistics (which pages are visited) to help prioritise tools. It never sees the content you process. To avoid even that, block analytics in your browser or self-host the app — every tool works identically.

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
npm test         # unit tests (Karma + Jasmine, headless Chrome)
```

> **Testing the PWA locally:** service workers require a production build served over HTTP(S), not `ng serve`. Build, then serve `dist/dev-toolbox/browser/` with any static server (e.g. `npx http-server dist/dev-toolbox/browser`).

---

## 📦 Tech Stack

- **Angular 22.2** — standalone-free NgModule app using the modern control-flow syntax (`@if`, `@for`).
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
