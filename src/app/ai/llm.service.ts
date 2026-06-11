import { Injectable, NgZone, computed, signal } from '@angular/core';
import type { MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm';
import { CapabilitiesService } from './capabilities.service';
import { DEFAULT_MODEL_ID } from './model-registry';
import {
  ChatMessage,
  DEFAULT_SETTINGS,
  GenerationOptions,
  LlmError,
  LlmResult,
  LlmSettings,
  LlmStatus,
} from './llm.types';
import { splitThinking } from './output-parser';

const DOWNLOADED_KEY = 'ai:downloadedModels';
const SETTINGS_KEY = 'ai:settings';

/**
 * LlmService — the single, reusable entry point for in-browser AI.
 *
 * Any tool (current or future) depends only on this service: it owns the model
 * lifecycle, runs inference inside a Web Worker (off the main thread), exposes
 * reactive state via signals, and offers both streaming chat and a one-shot
 * `run()` convenience for non-conversational tools.
 *
 * The heavy `@mlc-ai/web-llm` code is imported dynamically and lives in the
 * worker chunk, so it never touches the initial app bundle.
 */
@Injectable({ providedIn: 'root' })
export class LlmService {
  // ---- Reactive state -------------------------------------------------------
  readonly status = signal<LlmStatus>('idle');
  readonly progress = signal(0);
  readonly progressText = signal('');
  readonly currentModelId = signal<string | null>(null);
  readonly error = signal<LlmError | null>(null);
  /** Model ids known to be fully downloaded & cached in this browser. */
  readonly downloadedModels = signal<string[]>(this.readDownloaded());
  /** User-tunable generation defaults, persisted across sessions. */
  readonly settings = signal<LlmSettings>(this.readSettings());

  readonly isReady = computed(
    () => this.status() === 'ready' || this.status() === 'generating',
  );

  private engine: MLCEngineInterface | null = null;
  private worker: Worker | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private zone: NgZone,
    private capabilities: CapabilitiesService,
  ) {}

  /** True if the given model has been downloaded before (cached locally). */
  isDownloaded(modelId: string): boolean {
    return this.downloadedModels().includes(modelId);
  }

  /**
   * Ensures `modelId` is loaded and ready. Idempotent and concurrency-safe:
   * overlapping calls share one in-flight load. Switches models in place if a
   * different one is already loaded.
   */
  async ensureLoaded(modelId: string = DEFAULT_MODEL_ID): Promise<void> {
    if (this.engine && this.currentModelId() === modelId && this.isReady()) {
      return;
    }
    if (this.loadPromise) {
      await this.loadPromise;
      if (this.currentModelId() === modelId && this.isReady()) {
        return;
      }
    }
    this.loadPromise = this.doLoad(modelId).finally(() => (this.loadPromise = null));
    return this.loadPromise;
  }

  private async doLoad(modelId: string): Promise<void> {
    const report = await this.capabilities.detect();
    if (!report.webgpu) {
      const err = new LlmError('unsupported', report.webgpuReason ?? 'WebGPU is unavailable.');
      this.zone.run(() => {
        this.error.set(err);
        this.status.set('unsupported');
      });
      throw err;
    }

    this.zone.run(() => {
      this.error.set(null);
      this.progress.set(0);
      this.progressText.set('Preparing…');
      this.status.set('loading');
      this.currentModelId.set(modelId);
    });

    const onProgress = (r: InitProgressReport) =>
      this.zone.run(() => {
        this.progress.set(r.progress ?? 0);
        this.progressText.set(r.text ?? '');
      });

    try {
      const webllm = await import('@mlc-ai/web-llm');

      if (this.engine) {
        // Switch model in place, reusing the existing (worker) engine.
        await this.engine.reload(modelId);
      } else {
        this.engine = await this.createEngine(webllm, modelId, onProgress);
      }

      this.markDownloaded(modelId);
      this.zone.run(() => {
        this.progress.set(1);
        this.progressText.set('Ready');
        this.status.set('ready');
      });
    } catch (raw) {
      const err = LlmError.from(raw);
      this.zone.run(() => {
        this.error.set(err);
        this.status.set('error');
      });
      throw err;
    }
  }

  /**
   * Creates an engine, preferring a Web Worker for a responsive UI and falling
   * back to a main-thread engine if workers are unavailable in this context.
   */
  private async createEngine(
    webllm: typeof import('@mlc-ai/web-llm'),
    modelId: string,
    onProgress: (r: InitProgressReport) => void,
  ): Promise<MLCEngineInterface> {
    // Only fall back to the main thread when the WORKER itself is unavailable
    // (e.g. module workers unsupported). A genuine load failure (OOM, network,
    // compile) must NOT silently re-download and retry on the main thread.
    try {
      this.worker = new Worker(new URL('./llm-engine.worker', import.meta.url), {
        type: 'module',
      });
    } catch {
      this.worker = null;
    }
    if (!this.worker) {
      return webllm.CreateMLCEngine(modelId, { initProgressCallback: onProgress });
    }
    try {
      return await webllm.CreateWebWorkerMLCEngine(this.worker, modelId, {
        initProgressCallback: onProgress,
      });
    } catch (err) {
      // Tear down the worker so a retry doesn't leak it, then let doLoad's
      // catch classify the real failure via LlmError.from.
      this.worker.terminate();
      this.worker = null;
      throw err;
    }
  }

  /**
   * Streams a chat completion. Tokens arrive via `options.onToken`; the promise
   * resolves with the parsed final result (answer + optional reasoning).
   */
  async chat(messages: ChatMessage[], options: GenerationOptions = {}): Promise<LlmResult> {
    if (!this.engine || !this.isReady()) {
      throw new LlmError('not-loaded', 'No model is loaded. Call ensureLoaded() first.');
    }

    const modelId = this.currentModelId() ?? '';
    this.zone.run(() => this.status.set('generating'));
    let full = '';

    // Fall back to the user's saved settings for any unspecified option.
    const s = this.settings();
    const temperature = options.temperature ?? s.temperature;
    const topP = options.topP ?? s.topP;
    const maxTokens = options.maxTokens ?? s.maxTokens;
    const enableThinking = options.thinking ?? s.thinking;

    // Inject the configured system prompt if the caller didn't supply one.
    let outgoing = messages;
    if (s.system.trim() && !messages.some((m) => m.role === 'system')) {
      outgoing = [{ role: 'system', content: s.system.trim() }, ...messages];
    }

    try {
      const request: Record<string, unknown> = {
        stream: true,
        messages: outgoing,
        temperature,
        top_p: topP,
        // Reasoning off by default for fast, focused tool output. web-llm reads
        // this from `extra_body` (Qwen chat-template kwarg), not the top level.
        extra_body: { enable_thinking: enableThinking },
      };
      if (maxTokens) request['max_tokens'] = maxTokens;
      if (options.json) request['response_format'] = { type: 'json_object' };

      const stream = await this.engine.chat.completions.create(request as never);

      for await (const chunk of stream as unknown as AsyncIterable<{
        choices: { delta: { content?: string } }[];
      }>) {
        if (options.signal?.aborted) {
          await this.engine.interruptGenerate();
          throw new LlmError('aborted', 'Generation was cancelled.');
        }
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          this.zone.run(() => options.onToken?.(delta, full));
        }
      }

      this.zone.run(() => this.status.set('ready'));
      const { text, thinking } = splitThinking(full);
      return { text, thinking, modelId };
    } catch (raw) {
      const err = LlmError.from(raw);
      this.zone.run(() => {
        this.status.set('ready');
        if (err.kind !== 'aborted') {
          this.error.set(err);
        }
      });
      throw err;
    }
  }

  /**
   * One-shot convenience for non-conversational tools: send a single prompt
   * (with an optional system instruction) and get a parsed result back. Loads
   * the model first if needed.
   */
  async run(
    prompt: string,
    options: GenerationOptions & { system?: string; modelId?: string } = {},
  ): Promise<LlmResult> {
    await this.ensureLoaded(options.modelId ?? DEFAULT_MODEL_ID);
    const messages: ChatMessage[] = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: prompt });
    return this.chat(messages, options);
  }

  /** Releases the model and tears down the worker. */
  async unload(): Promise<void> {
    try {
      await this.engine?.unload();
    } catch {
      /* best effort */
    }
    this.worker?.terminate();
    this.worker = null;
    this.engine = null;
    this.zone.run(() => {
      this.currentModelId.set(null);
      this.progress.set(0);
      this.progressText.set('');
      if (this.status() !== 'unsupported') {
        this.status.set('idle');
      }
    });
  }

  // ---- Download persistence -------------------------------------------------
  private readDownloaded(): string[] {
    try {
      const raw = localStorage.getItem(DOWNLOADED_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private markDownloaded(modelId: string): void {
    if (this.downloadedModels().includes(modelId)) {
      return;
    }
    const next = [...this.downloadedModels(), modelId];
    this.zone.run(() => this.downloadedModels.set(next));
    try {
      localStorage.setItem(DOWNLOADED_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable (private mode); non-fatal */
    }
  }

  // ---- Settings persistence -------------------------------------------------
  /** Merge a partial settings patch and persist. */
  updateSettings(patch: Partial<LlmSettings>): void {
    const next = { ...this.settings(), ...patch };
    this.settings.set(next);
    this.persistSettings(next);
  }

  /** Restore built-in defaults. */
  resetSettings(): void {
    this.settings.set({ ...DEFAULT_SETTINGS });
    this.persistSettings(DEFAULT_SETTINGS);
  }

  private readSettings(): LlmSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw
        ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<LlmSettings>) }
        : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(settings: LlmSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be unavailable (private mode); non-fatal */
    }
  }
}
