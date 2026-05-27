import { Component } from '@angular/core';

interface ModelPricing {
  provider: string;
  model: string;
  displayName: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  // Prompt cache pricing (per 1M tokens). Undefined = caching not supported.
  cacheWritePricePer1M?: number;
  cacheReadPricePer1M?: number;
  contextWindow: number;
  outputLimit?: number;
  notes?: string;
}

@Component({
  selector: 'app-token-counter',
  standalone: false,
  templateUrl: './token-counter.html',
  styleUrls: ['./token-counter.scss']
})
export class TokenCounter {
  inputText: string = '';
  outputText: string = '';

  selectedProvider: string = 'anthropic';
  selectedModel: string = 'claude-opus-4-7';

  cachedInputPercent: number = 0;
  batchRequests: number = 1000;

  // Pricing as of January 2026. Verify with each provider's official pricing
  // page before relying on these numbers for procurement.
  // Sources: anthropic.com/pricing, openai.com/api/pricing, ai.google.dev/pricing.
  models: ModelPricing[] = [
    // ---------- Anthropic Claude ----------
    {
      provider: 'anthropic', model: 'claude-opus-4-7', displayName: 'Claude Opus 4.7',
      inputPricePer1M: 15.00, outputPricePer1M: 75.00,
      cacheWritePricePer1M: 18.75, cacheReadPricePer1M: 1.50,
      contextWindow: 200000, outputLimit: 32000,
      notes: 'Highest capability. Extended thinking supported.'
    },
    {
      provider: 'anthropic', model: 'claude-opus-4-5', displayName: 'Claude Opus 4.5',
      inputPricePer1M: 5.00, outputPricePer1M: 25.00,
      cacheWritePricePer1M: 6.25, cacheReadPricePer1M: 0.50,
      contextWindow: 200000, outputLimit: 32000,
      notes: 'Previous-gen Opus at reduced price.'
    },
    {
      provider: 'anthropic', model: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6',
      inputPricePer1M: 3.00, outputPricePer1M: 15.00,
      cacheWritePricePer1M: 3.75, cacheReadPricePer1M: 0.30,
      contextWindow: 200000, outputLimit: 64000,
      notes: 'Default frontier balance of quality vs cost.'
    },
    {
      provider: 'anthropic', model: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5',
      inputPricePer1M: 3.00, outputPricePer1M: 15.00,
      cacheWritePricePer1M: 3.75, cacheReadPricePer1M: 0.30,
      contextWindow: 200000, outputLimit: 64000
    },
    {
      provider: 'anthropic', model: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5',
      inputPricePer1M: 1.00, outputPricePer1M: 5.00,
      cacheWritePricePer1M: 1.25, cacheReadPricePer1M: 0.10,
      contextWindow: 200000, outputLimit: 16000,
      notes: 'Fast/cheap tier; good for high-volume workloads.'
    },
    {
      provider: 'anthropic', model: 'claude-haiku-3-5', displayName: 'Claude Haiku 3.5',
      inputPricePer1M: 0.80, outputPricePer1M: 4.00,
      cacheWritePricePer1M: 1.00, cacheReadPricePer1M: 0.08,
      contextWindow: 200000
    },

    // ---------- OpenAI ----------
    {
      provider: 'openai', model: 'gpt-5.1', displayName: 'GPT-5.1',
      inputPricePer1M: 1.25, outputPricePer1M: 10.00,
      cacheReadPricePer1M: 0.125,
      contextWindow: 400000, outputLimit: 100000,
      notes: 'Latest flagship; supports cached input discount (~90%).'
    },
    {
      provider: 'openai', model: 'gpt-5', displayName: 'GPT-5',
      inputPricePer1M: 1.25, outputPricePer1M: 10.00,
      cacheReadPricePer1M: 0.125,
      contextWindow: 400000, outputLimit: 100000
    },
    {
      provider: 'openai', model: 'gpt-5-mini', displayName: 'GPT-5 mini',
      inputPricePer1M: 0.25, outputPricePer1M: 2.00,
      cacheReadPricePer1M: 0.025,
      contextWindow: 400000, outputLimit: 100000
    },
    {
      provider: 'openai', model: 'gpt-5-nano', displayName: 'GPT-5 nano',
      inputPricePer1M: 0.05, outputPricePer1M: 0.40,
      cacheReadPricePer1M: 0.005,
      contextWindow: 400000, outputLimit: 100000
    },
    {
      provider: 'openai', model: 'o3', displayName: 'o3 (reasoning)',
      inputPricePer1M: 2.00, outputPricePer1M: 8.00,
      cacheReadPricePer1M: 0.50,
      contextWindow: 200000, outputLimit: 100000,
      notes: 'Reasoning model — billed output includes hidden reasoning tokens.'
    },
    {
      provider: 'openai', model: 'o4-mini', displayName: 'o4-mini (reasoning)',
      inputPricePer1M: 1.10, outputPricePer1M: 4.40,
      cacheReadPricePer1M: 0.275,
      contextWindow: 200000, outputLimit: 100000
    },
    {
      provider: 'openai', model: 'gpt-4.1', displayName: 'GPT-4.1',
      inputPricePer1M: 2.00, outputPricePer1M: 8.00,
      cacheReadPricePer1M: 0.50,
      contextWindow: 1000000, outputLimit: 32000
    },
    {
      provider: 'openai', model: 'gpt-4.1-mini', displayName: 'GPT-4.1 mini',
      inputPricePer1M: 0.40, outputPricePer1M: 1.60,
      cacheReadPricePer1M: 0.10,
      contextWindow: 1000000, outputLimit: 32000
    },
    {
      provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o',
      inputPricePer1M: 2.50, outputPricePer1M: 10.00,
      cacheReadPricePer1M: 1.25,
      contextWindow: 128000, outputLimit: 16000
    },
    {
      provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini',
      inputPricePer1M: 0.15, outputPricePer1M: 0.60,
      cacheReadPricePer1M: 0.075,
      contextWindow: 128000, outputLimit: 16000
    },

    // ---------- Google Gemini ----------
    {
      provider: 'google', model: 'gemini-3-pro', displayName: 'Gemini 3 Pro',
      inputPricePer1M: 1.25, outputPricePer1M: 10.00,
      cacheReadPricePer1M: 0.31,
      contextWindow: 2000000, outputLimit: 64000,
      notes: 'Tier pricing: >200k input tokens may bill at higher rate.'
    },
    {
      provider: 'google', model: 'gemini-3-flash', displayName: 'Gemini 3 Flash',
      inputPricePer1M: 0.30, outputPricePer1M: 2.50,
      cacheReadPricePer1M: 0.075,
      contextWindow: 1000000, outputLimit: 64000
    },
    {
      provider: 'google', model: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro',
      inputPricePer1M: 1.25, outputPricePer1M: 10.00,
      cacheReadPricePer1M: 0.31,
      contextWindow: 2000000, outputLimit: 64000
    },
    {
      provider: 'google', model: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash',
      inputPricePer1M: 0.30, outputPricePer1M: 2.50,
      cacheReadPricePer1M: 0.075,
      contextWindow: 1000000, outputLimit: 64000
    },
    {
      provider: 'google', model: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite',
      inputPricePer1M: 0.10, outputPricePer1M: 0.40,
      contextWindow: 1000000
    },

    // ---------- Meta Llama (via inference providers) ----------
    {
      provider: 'meta', model: 'llama-3.3-70b', displayName: 'Llama 3.3 70B',
      inputPricePer1M: 0.60, outputPricePer1M: 0.60,
      contextWindow: 128000,
      notes: 'Price varies by inference provider (Groq, Together, Fireworks, etc.).'
    },
    {
      provider: 'meta', model: 'llama-3.1-405b', displayName: 'Llama 3.1 405B',
      inputPricePer1M: 3.50, outputPricePer1M: 3.50,
      contextWindow: 128000
    },
    {
      provider: 'meta', model: 'llama-3.1-70b', displayName: 'Llama 3.1 70B',
      inputPricePer1M: 0.60, outputPricePer1M: 0.60,
      contextWindow: 128000
    },
    {
      provider: 'meta', model: 'llama-3.1-8b', displayName: 'Llama 3.1 8B',
      inputPricePer1M: 0.18, outputPricePer1M: 0.18,
      contextWindow: 128000
    },
  ];

  providers = [
    { value: 'anthropic', label: 'Anthropic (Claude)' },
    { value: 'openai', label: 'OpenAI (GPT / o-series)' },
    { value: 'google', label: 'Google (Gemini)' },
    { value: 'meta', label: 'Meta (Llama)' }
  ];

  // Approximate characters-per-token by tokenizer family for English-dominant text.
  // Real tokenization varies with language, code, whitespace, emoji, etc.
  // Sources: tokenizer benchmarks vs each vendor's published behavior.
  private readonly charsPerToken: Record<string, number> = {
    anthropic: 3.6,   // Claude tokenizer
    openai: 4.0,      // tiktoken cl100k / o200k
    google: 4.2,      // Gemini SentencePiece
    meta: 3.8         // Llama tokenizer
  };

  get filteredModels(): ModelPricing[] {
    return this.models.filter(m => m.provider === this.selectedProvider);
  }

  get currentModel(): ModelPricing | undefined {
    return this.models.find(m => m.model === this.selectedModel);
  }

  get supportsCaching(): boolean {
    return !!this.currentModel?.cacheReadPricePer1M;
  }

  get supportsCacheWrite(): boolean {
    return !!this.currentModel?.cacheWritePricePer1M;
  }

  get inputTokens(): number {
    return this.estimateTokens(this.inputText);
  }

  get outputTokens(): number {
    return this.estimateTokens(this.outputText);
  }

  get totalTokens(): number {
    return this.inputTokens + this.outputTokens;
  }

  get cachedInputTokens(): number {
    if (!this.supportsCaching) return 0;
    return Math.round(this.inputTokens * (this.cachedInputPercent / 100));
  }

  get freshInputTokens(): number {
    return this.inputTokens - this.cachedInputTokens;
  }

  get inputCost(): number {
    if (!this.currentModel) return 0;
    const freshCost = (this.freshInputTokens / 1_000_000) * this.currentModel.inputPricePer1M;
    if (!this.supportsCaching || this.cachedInputTokens === 0) return freshCost;
    const cacheReadCost =
      (this.cachedInputTokens / 1_000_000) * (this.currentModel.cacheReadPricePer1M || 0);
    return freshCost + cacheReadCost;
  }

  // One-time cost to populate the prompt cache for the cached portion.
  // Anthropic charges ~25% extra on the write; OpenAI/Gemini do not.
  get cacheWriteCost(): number {
    if (!this.currentModel || !this.supportsCacheWrite || this.cachedInputTokens === 0) return 0;
    return (this.cachedInputTokens / 1_000_000) * (this.currentModel.cacheWritePricePer1M || 0);
  }

  get inputCostWithoutCaching(): number {
    if (!this.currentModel) return 0;
    return (this.inputTokens / 1_000_000) * this.currentModel.inputPricePer1M;
  }

  get cacheSavings(): number {
    return Math.max(0, this.inputCostWithoutCaching - this.inputCost);
  }

  get cacheBreakEvenRequests(): number | null {
    if (this.cacheWriteCost <= 0 || this.cacheSavings <= 0) return null;
    return Math.ceil(this.cacheWriteCost / this.cacheSavings);
  }

  get outputCost(): number {
    if (!this.currentModel) return 0;
    return (this.outputTokens / 1_000_000) * this.currentModel.outputPricePer1M;
  }

  get totalCost(): number {
    return this.inputCost + this.outputCost;
  }

  get contextUsagePercent(): number {
    if (!this.currentModel) return 0;
    return (this.totalTokens / this.currentModel.contextWindow) * 100;
  }

  // Provider-aware token estimation. Uses an average of word- and character-based
  // heuristics, scaled to the tokenizer family for the selected provider.
  // This is an estimate — for billing, use the provider's official tokenizer.
  estimateTokens(text: string): number {
    if (!text) return 0;

    const ratio = this.charsPerToken[this.selectedProvider] ?? 4.0;

    // Character-based estimate (primary signal).
    const charBased = text.length / ratio;

    // Word-based estimate (secondary signal). English words average ~1.3 tokens.
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const wordBased = words * 1.3;

    // Special characters and punctuation slightly raise token count
    // (BPE splits on punctuation boundaries).
    const specials = (text.match(/[^\w\s]/g) || []).length;
    const codeSymbols = (text.match(/[{}[\]()<>;:=]/g) || []).length;

    const blended = (charBased * 0.65) + (wordBased * 0.35);
    return Math.max(1, Math.ceil(blended + specials * 0.15 + codeSymbols * 0.1));
  }

  onProviderChange(): void {
    const firstModel = this.filteredModels[0];
    if (firstModel) {
      this.selectedModel = firstModel.model;
    }
  }

  formatCurrency(amount: number): string {
    if (amount === 0) return '$0';
    if (Math.abs(amount) < 0.01) {
      return `${(amount * 100).toFixed(4)}¢`;
    }
    if (Math.abs(amount) < 1) {
      return `$${amount.toFixed(4)}`;
    }
    return `$${amount.toFixed(amount < 100 ? 4 : 2)}`;
  }

  formatNumber(num: number): string {
    return Math.round(num).toLocaleString();
  }

  clearAll(): void {
    this.inputText = '';
    this.outputText = '';
  }

  get batchInputTokens(): number {
    return this.inputTokens * this.batchRequests;
  }

  get batchOutputTokens(): number {
    return this.outputTokens * this.batchRequests;
  }

  get batchTotalCost(): number {
    return this.totalCost * this.batchRequests;
  }

  get batchCacheSavings(): number {
    return this.cacheSavings * this.batchRequests;
  }
}
