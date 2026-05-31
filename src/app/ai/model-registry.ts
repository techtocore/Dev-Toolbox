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

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    label: 'Qwen3 0.6B',
    tier: 'tiny',
    vramMb: 1403,
    minMemoryGb: 4,
    downloadSize: '~0.4 GB',
    contextTokens: 4096,
    note: 'Smallest option. Best for low-end devices and phones.',
    lowResource: true,
  },
  {
    id: 'Qwen3.5-0.8B-q4f16_1-MLC',
    label: 'Qwen3.5 0.8B',
    tier: 'small',
    vramMb: 1629,
    minMemoryGb: 6,
    downloadSize: '~0.6 GB',
    contextTokens: 4096,
    note: 'Newest small Qwen. Fast, capable, low memory. Recommended.',
    lowResource: true,
  },
  {
    id: 'Qwen3.5-0.8B-q4f32_1-MLC',
    label: 'Qwen3.5 0.8B (f32)',
    tier: 'small',
    vramMb: 1894,
    minMemoryGb: 6,
    downloadSize: '~0.7 GB',
    contextTokens: 4096,
    note: 'Higher-precision activations. Slightly slower, a bit more accurate.',
    lowResource: true,
  },
  {
    id: 'Qwen3.5-2B-q4f16_1-MLC',
    label: 'Qwen3.5 2B',
    tier: 'medium',
    vramMb: 2245,
    minMemoryGb: 8,
    downloadSize: '~1.3 GB',
    contextTokens: 4096,
    note: 'Stronger reasoning and writing. Needs a capable GPU.',
    lowResource: false,
  },
];

/** Loaded by default when a user first opens a local AI tool. */
export const DEFAULT_MODEL_ID = 'Qwen3.5-0.8B-q4f16_1-MLC';

export function findModel(id: string): LocalModel | undefined {
  return LOCAL_MODELS.find((m) => m.id === id);
}

export function modelsByTier(tier: ModelTier): LocalModel[] {
  return LOCAL_MODELS.filter((m) => m.tier === tier);
}
