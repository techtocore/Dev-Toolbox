/// <reference lib="webworker" />

/**
 * Dedicated Web Worker that hosts the WebLLM engine.
 *
 * Running inference here keeps token generation and the (heavy) WASM/WebGPU
 * work off the main thread, so the UI stays responsive while the model thinks.
 * The main thread talks to this worker through `CreateWebWorkerMLCEngine`,
 * which proxies the standard engine API over `postMessage`.
 *
 * The entire `@mlc-ai/web-llm` bundle is pulled into this worker chunk, so it
 * never weighs down the main application bundle.
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
