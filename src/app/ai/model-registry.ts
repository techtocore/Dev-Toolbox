/**
 * Curated registry of browser-runnable models for the local AI subsystem.
 *
 * Every `id` MUST exist in WebLLM's `prebuiltAppConfig.model_list`
 * (https://github.com/mlc-ai/web-llm/blob/main/src/config.ts). WebLLM downloads
 * the quantized weights + WebGPU `.wasm` on first use and caches them in the
 * browser, so subsequent loads are instant.
 *
 * To add a model: pick a valid `model_id`, add an entry, and every consumer
 * (picker, capability checks, recommendations) updates automatically.
 */

/** Rough size class, used to match a model to detected hardware. */
export type ModelTier = 'tiny' | 'small' | 'medium';

export interface LocalModel {
  /** WebLLM `model_id` — must match the prebuilt config exactly. */
  id: string;
  /** Human-friendly label shown in the UI. */
  label: string;
  /** Size class for hardware-based recommendation. */
  tier: ModelTier;
  /** Approximate VRAM/RAM footprint while loaded, in MB. */
  vramMb: number;
  /** Recommended minimum device memory (GB) for a smooth experience. */
  minMemoryGb: number;
  /** Approximate one-time download size, human readable. */
  downloadSize: string;
  /** Context window in tokens. */
  contextTokens: number;
  /** Short capability note for the picker. */
  note: string;
  /** Comfortable on integrated GPUs / mid-range laptops. */
  lowResource: boolean;
}

/**
 * A curated, multi-vendor selection — not just one model family — so users can
 * pick the trade-off (and the vendor) that suits them. Every entry is verified
 * against `@mlc-ai/web-llm`'s `prebuiltAppConfig`; `vramMb` and `lowResource`
 * are the engine's own `vram_required_MB` / `low_resource_required` values, and
 * each `contextTokens` matches the config's `context_window_size`.
 *
 * Vendors: Alibaba (Qwen), Google (Gemma), Meta (Llama), Microsoft (Phi).
 * Tiers ascend by capability and footprint; `recommendModel()` auto-picks the
 * most capable one that fits the detected hardware.
 */
export const LOCAL_MODELS: LocalModel[] = [
  // ── Tiny — phones, integrated GPUs, low-end laptops ──────────────────────
  {
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    label: 'Qwen3 0.6B',
    tier: 'tiny',
    vramMb: 1403,
    minMemoryGb: 4,
    downloadSize: '~0.4 GB',
    contextTokens: 4096,
    note: 'Alibaba · smallest download. Reasoning-capable; best for phones and low-end devices.',
    lowResource: true,
  },
  {
    id: 'gemma3-1b-it-q4f16_1-MLC',
    label: 'Gemma 3 1B',
    tier: 'tiny',
    vramMb: 711,
    minMemoryGb: 4,
    downloadSize: '~0.6 GB',
    contextTokens: 4096,
    note: 'Google · ultra-light and quick. Lowest memory footprint here; great for modest hardware.',
    lowResource: true,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    tier: 'tiny',
    vramMb: 879,
    minMemoryGb: 4,
    downloadSize: '~0.8 GB',
    contextTokens: 4096,
    note: 'Meta · light and broadly compatible. A dependable general-purpose assistant.',
    lowResource: true,
  },

  // ── Small — the sweet spot for most laptops ──────────────────────────────
  {
    id: 'Qwen3.5-0.8B-q4f16_1-MLC',
    label: 'Qwen3.5 0.8B',
    tier: 'small',
    vramMb: 1629,
    minMemoryGb: 4,
    downloadSize: '~0.6 GB',
    contextTokens: 4096,
    note: 'Alibaba · newest small Qwen. Fast, capable, low memory. Recommended default.',
    lowResource: true,
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 2B',
    tier: 'small',
    vramMb: 1895,
    minMemoryGb: 6,
    downloadSize: '~1.6 GB',
    contextTokens: 4096,
    note: 'Google · strong all-rounder, especially for writing and structured output.',
    lowResource: false,
  },

  // ── Medium — capable discrete/Apple-silicon GPUs ─────────────────────────
  {
    id: 'Qwen3.5-2B-q4f16_1-MLC',
    label: 'Qwen3.5 2B',
    tier: 'medium',
    vramMb: 2245,
    minMemoryGb: 8,
    downloadSize: '~1.3 GB',
    contextTokens: 4096,
    note: 'Alibaba · stronger reasoning and writing than the small tier. Needs a capable GPU.',
    lowResource: false,
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B',
    tier: 'medium',
    vramMb: 2264,
    minMemoryGb: 8,
    downloadSize: '~1.9 GB',
    contextTokens: 4096,
    note: 'Meta · the widely-benchmarked 3B. Excellent, well-rounded general quality.',
    lowResource: false,
  },
  {
    id: 'Phi-4-mini-instruct-q4f16_1-MLC',
    label: 'Phi-4 mini',
    tier: 'medium',
    vramMb: 3438,
    minMemoryGb: 8,
    downloadSize: '~2.3 GB',
    contextTokens: 4096,
    note: 'Microsoft (MIT) · best-in-class reasoning and math for its size. Largest download.',
    lowResource: false,
  },
];

/**
 * Loaded by default when a user first opens a local AI tool (and when hardware
 * memory is unknown). Small, fast, low-memory, yet capable — a safe pick that
 * `recommendModel()` upgrades on roomier devices.
 */
export const DEFAULT_MODEL_ID = 'Qwen3.5-0.8B-q4f16_1-MLC';

export function findModel(id: string): LocalModel | undefined {
  return LOCAL_MODELS.find((m) => m.id === id);
}

export function modelsByTier(tier: ModelTier): LocalModel[] {
  return LOCAL_MODELS.filter((m) => m.tier === tier);
}
