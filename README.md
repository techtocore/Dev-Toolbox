# Dev Toolbox

A collection of web-based developer utilities. These tools help with common tasks like encoding/decoding, JSON formatting, text processing, and cryptography operations — all running entirely in your browser, with no servers and no data leaving your device.

## 🛠️ Available Tools

### Cryptography
- **Base64 Encode/Decode** - Convert text to/from Base64 encoding
- **URL Encode/Decode** - Encode/decode URL parameters and strings
- **Hash Generator** - Generate MD5, SHA-1, SHA-256, and SHA-512 hashes
- **JWT Decoder** - Decode and inspect JWT tokens (header, payload, signature)
- **Certificate Information** - Extract and view X.509 certificate details

### Text Processing
- **Markdown Editor** - Live markdown preview and editing
- **Word Counter** - Analyze text statistics (words, characters, lines)
- **Diff Checker** - Compare two text blocks with side-by-side difference highlighting

### Data & Formatting
- **JSON Formatter** - Validate and pretty-print JSON with syntax highlighting
- **Timestamp Converter** - Convert between Unix timestamps, ISO 8601, and human-readable formats
- **Numeric Summary** - Statistical analysis of numeric data (mean, median, mode, etc.)

### Development Tools
- **UUID Generator** - Generate multiple UUIDs (v4) at once
- **Color Converter** - Convert between HEX, RGB, and HSL color formats with visual color picker
- **Regex Tester** - Test regular expressions with live matching and highlighting, or generate a pattern from a plain-English description (on-device AI)

### AI & Machine Learning
- **Local AI (Chat)** - A small language model that runs fully on-device via WebGPU. No accounts, no servers — your conversation never leaves the browser. Includes a hardware-aware model picker spanning **Qwen (Alibaba), Gemma (Google), Llama (Meta), and Phi (Microsoft)** — from a 0.4 GB tiny model for phones up to Phi-4-mini for capable GPUs — plus one-time cached downloads and tunable generation settings (system prompt, temperature, top-p, max tokens, reasoning).
- **On-device AI Assist** *(across tools)* - The same WebGPU model is embedded as an **optional, private co-pilot** inside several existing tools — collapsed by default, so the tools keep working without it (and gracefully degrade when WebGPU is unavailable). It powers: **Prompt Optimizer** (rewrite a prompt to best practices), **Regex Tester** (plain English → pattern), **SQL Query Builder** (plain English → SQL), **JSON Schema Generator** (describe data → fields), and **Data Profiler** (plain-English insights over a dataset). The model loads once and is shared across every tool, so the first download benefits all of them.

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- For **Local AI**: a WebGPU-capable browser (recent Chrome/Edge on desktop, or Safari 18+)

### Installation

```bash
# Clone the repository
git clone https://github.com/techtocore/Dev-Toolbox.git
cd Dev-Toolbox

# Install dependencies
npm install
```

### Development Server

```bash
npm start
```

Navigate to `http://localhost:4200/`. The app will automatically reload when you change source files.

### Production Build

```bash
npm run build
```

Build artifacts will be stored in the `dist/dev-toolbox/` directory.

### Other Commands

```bash
# Run linting
npm run lint

# Run unit tests
npm test
```

## 📦 Tech Stack

- **Angular 21.2** - Modern web framework with new control flow syntax (@if, @for), standalone components, and lazy-loaded routes
- **TypeScript 5.9** - Type-safe development
- **Bootstrap 5.3** - Responsive UI components
- **RxJS 7.8** - Reactive programming
- **ESLint 9.39** - Code quality and consistency
- **Zone.js 0.16** - Change detection with event coalescing
- **Marked 16.4** - Markdown parsing
- **Node-Forge 1.4** - Certificate parsing
- **Crypto-JS 4.2** - Cryptographic functions
- **@mlc-ai/web-llm 0.2** - In-browser LLM inference over WebGPU (Web Worker backed, lazy-loaded)

## 📄 License

This project is open source and available for use and modification.

## 👥 Contributors

<a href="https://github.com/techtocore/Dev-Toolbox/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=techtocore/Dev-Toolbox" />
</a>
