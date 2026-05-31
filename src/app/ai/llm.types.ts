/**
 * Shared types for the local (in-browser) AI subsystem.
 *
 * These types form the stable contract that every AI-powered tool depends on.
 * Keeping them isolated means tools never import WebLLM directly — they talk
 * only to `LlmService`, so the underlying engine can evolve without touching
 * tool code.
 */

/** Coarse lifecycle state, suitable for UI gating. */
export type LlmStatus =
  | 'idle' // nothing loaded yet
  | 'checking' // probing hardware capabilities
  | 'unsupported' // WebGPU / hardware cannot run a model
  | 'loading' // downloading / compiling a model
  | 'ready' // model loaded, awaiting work
  | 'generating' // actively producing tokens
  | 'error'; // last operation failed

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Options accepted by streaming / one-shot generation calls. */
export interface GenerationOptions {
  /** 0 = deterministic, higher = more creative. Default 0.7. */
  temperature?: number;
  /** Hard cap on generated tokens. */
  maxTokens?: number;
  /** Nucleus sampling cutoff. */
  topP?: number;
  /**
   * Enable the model's chain-of-thought (`<think>…</think>`). Off by default
   * for snappy tool responses; turn on for reasoning-heavy tasks.
   */
  thinking?: boolean;
  /**
   * Ask the model to emit strict JSON. When true, the engine is hinted to
   * constrain output and the parser will attempt to extract a JSON object.
   */
  json?: boolean;
  /** Called for every streamed token. `full` is the running concatenation. */
  onToken?: (delta: string, full: string) => void;
  /** Cancel generation cooperatively. */
  signal?: AbortSignal;
}

/** Result of a completed generation, with reasoning separated from answer. */
export interface LlmResult {
  /** The user-facing answer with any `<think>` block removed. */
  text: string;
  /** Extracted chain-of-thought, if the model produced one. */
  thinking?: string;
  /** The model that produced this result. */
  modelId: string;
}

/**
 * User-tunable generation defaults, surfaced by the shared settings UI and
 * applied to every call unless a tool overrides them per-request. Persisted
 * across sessions so a user's preferences stick.
 */
export interface LlmSettings {
  /** System instruction prepended to conversations. Empty = none. */
  system: string;
  /** Sampling temperature (0–2). */
  temperature: number;
  /** Nucleus sampling cutoff (0–1). */
  topP: number;
  /** Max tokens to generate per response. */
  maxTokens: number;
  /** Expose the model's chain-of-thought reasoning. */
  thinking: boolean;
}

/** Built-in, sensible defaults for a fresh install. */
export const DEFAULT_SETTINGS: LlmSettings = {
  system: '',
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 1024,
  thinking: false,
};


/** Categories of failure, so the UI can respond appropriately. */
export type LlmErrorKind =
  | 'unsupported' // no WebGPU / hardware too limited
  | 'out-of-memory' // GPU ran out of memory loading or running
  | 'network' // model download failed
  | 'aborted' // caller cancelled
  | 'not-loaded' // generate() called before a model was ready
  | 'unknown';

/** A typed error carrying a stable `kind` plus a friendly message. */
export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmError';
  }

  /** Best-effort classification of an arbitrary thrown value. */
  static from(err: unknown): LlmError {
    if (err instanceof LlmError) {
      return err;
    }
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();

    if (lower.includes('out of memory') || lower.includes('oom') || lower.includes('allocation')) {
      return new LlmError(
        'out-of-memory',
        'The model ran out of GPU memory. Try a smaller model.',
        err,
      );
    }
    if (
      lower.includes('failed to fetch') ||
      lower.includes('network') ||
      lower.includes('load') && lower.includes('http')
    ) {
      return new LlmError(
        'network',
        'Failed to download the model. Check your connection and try again.',
        err,
      );
    }
    if (lower.includes('abort')) {
      return new LlmError('aborted', 'Generation was cancelled.', err);
    }
    return new LlmError('unknown', message, err);
  }
}
