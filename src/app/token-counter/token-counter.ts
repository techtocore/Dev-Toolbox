import { Component } from '@angular/core';

interface ModelPricing {
  provider: string;
  model: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  contextWindow: number;
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
  selectedModel: string = 'claude-sonnet-4.5';

  // Model pricing (as of January 2026)
  models: ModelPricing[] = [
    // Anthropic Claude (2026 pricing)
    { provider: 'anthropic', model: 'claude-opus-4.5', inputPricePer1M: 5.00, outputPricePer1M: 25.00, contextWindow: 200000 },
    { provider: 'anthropic', model: 'claude-opus-4.1', inputPricePer1M: 15.00, outputPricePer1M: 75.00, contextWindow: 200000 },
    { provider: 'anthropic', model: 'claude-sonnet-4.5', inputPricePer1M: 3.00, outputPricePer1M: 15.00, contextWindow: 200000 },
    { provider: 'anthropic', model: 'claude-sonnet-4', inputPricePer1M: 3.00, outputPricePer1M: 15.00, contextWindow: 200000 },
    { provider: 'anthropic', model: 'claude-haiku-4.5', inputPricePer1M: 1.00, outputPricePer1M: 5.00, contextWindow: 200000 },
    { provider: 'anthropic', model: 'claude-haiku-3.5', inputPricePer1M: 0.80, outputPricePer1M: 4.00, contextWindow: 200000 },

    // OpenAI (2026 pricing)
    { provider: 'openai', model: 'o1', inputPricePer1M: 15.00, outputPricePer1M: 60.00, contextWindow: 200000 },
    { provider: 'openai', model: 'o3', inputPricePer1M: 2.00, outputPricePer1M: 8.00, contextWindow: 128000 },
    { provider: 'openai', model: 'o4-mini', inputPricePer1M: 1.10, outputPricePer1M: 4.40, contextWindow: 128000 },
    { provider: 'openai', model: 'gpt-4o', inputPricePer1M: 2.50, outputPricePer1M: 10.00, contextWindow: 128000 },
    { provider: 'openai', model: 'gpt-4o-mini', inputPricePer1M: 0.15, outputPricePer1M: 0.60, contextWindow: 128000 },
    { provider: 'openai', model: 'gpt-4.1-nano', inputPricePer1M: 0.10, outputPricePer1M: 0.40, contextWindow: 128000 },
    { provider: 'openai', model: 'gpt-4-turbo', inputPricePer1M: 10.00, outputPricePer1M: 30.00, contextWindow: 128000 },

    // Google Gemini (2026 pricing)
    { provider: 'google', model: 'gemini-3-flash', inputPricePer1M: 0.50, outputPricePer1M: 3.00, contextWindow: 1000000 },
    { provider: 'google', model: 'gemini-2.5-pro', inputPricePer1M: 1.25, outputPricePer1M: 10.00, contextWindow: 2000000 },
    { provider: 'google', model: 'gemini-2.5-flash', inputPricePer1M: 0.30, outputPricePer1M: 2.50, contextWindow: 1000000 },
    { provider: 'google', model: 'gemini-2.5-flash-lite', inputPricePer1M: 0.10, outputPricePer1M: 0.40, contextWindow: 1000000 },
    { provider: 'google', model: 'gemini-2.0-flash', inputPricePer1M: 0.10, outputPricePer1M: 0.40, contextWindow: 1000000 },
    { provider: 'google', model: 'gemini-2.0-flash-lite', inputPricePer1M: 0.075, outputPricePer1M: 0.30, contextWindow: 1000000 },

    // Meta Llama (via third-party providers)
    { provider: 'meta', model: 'llama-3.3-70b', inputPricePer1M: 0.60, outputPricePer1M: 0.60, contextWindow: 128000 },
    { provider: 'meta', model: 'llama-3.1-405b', inputPricePer1M: 5.00, outputPricePer1M: 15.00, contextWindow: 128000 },
    { provider: 'meta', model: 'llama-3.1-70b', inputPricePer1M: 0.90, outputPricePer1M: 0.90, contextWindow: 128000 },
    { provider: 'meta', model: 'llama-3.1-8b', inputPricePer1M: 0.20, outputPricePer1M: 0.20, contextWindow: 128000 },
  ];

  providers = [
    { value: 'anthropic', label: 'Anthropic (Claude)' },
    { value: 'openai', label: 'OpenAI (GPT)' },
    { value: 'google', label: 'Google (Gemini)' },
    { value: 'meta', label: 'Meta (Llama)' }
  ];

  get filteredModels(): ModelPricing[] {
    return this.models.filter(m => m.provider === this.selectedProvider);
  }

  get currentModel(): ModelPricing | undefined {
    return this.models.find(m => m.model === this.selectedModel);
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

  get inputCost(): number {
    if (!this.currentModel) return 0;
    return (this.inputTokens / 1000000) * this.currentModel.inputPricePer1M;
  }

  get outputCost(): number {
    if (!this.currentModel) return 0;
    return (this.outputTokens / 1000000) * this.currentModel.outputPricePer1M;
  }

  get totalCost(): number {
    return this.inputCost + this.outputCost;
  }

  get contextUsagePercent(): number {
    if (!this.currentModel) return 0;
    return (this.totalTokens / this.currentModel.contextWindow) * 100;
  }

  // Simple token estimation based on characters and words
  // This is a rough approximation. Real tokenization varies by model.
  estimateTokens(text: string): number {
    if (!text) return 0;

    // Average token length is ~4 characters for English text
    // We'll use a more sophisticated approach:
    // - Count words
    // - Count punctuation and special characters
    // - Estimate based on character count

    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const specialChars = (text.match(/[^\w\s]/g) || []).length;

    // Rough estimation:
    // - Each word is typically 1-2 tokens
    // - Special characters often are separate tokens
    // - Use character-based backup

    const wordBasedEstimate = words * 1.3;
    const charBasedEstimate = text.length / 4;
    const specialCharBonus = specialChars * 0.5;

    // Use average of methods
    return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2 + specialCharBonus);
  }

  calculateBulkCost(requests: number): number {
    return this.totalCost * requests;
  }

  onProviderChange(): void {
    // Set first model of selected provider as default
    const firstModel = this.filteredModels[0];
    if (firstModel) {
      this.selectedModel = firstModel.model;
    }
  }

  formatCurrency(amount: number): string {
    if (amount < 0.01) {
      return `$${(amount * 100).toFixed(4)}¢`;
    }
    return `$${amount.toFixed(4)}`;
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  clearAll(): void {
    this.inputText = '';
    this.outputText = '';
  }

  // Batch cost calculator
  batchRequests: number = 1000;

  get batchInputTokens(): number {
    return this.inputTokens * this.batchRequests;
  }

  get batchOutputTokens(): number {
    return this.outputTokens * this.batchRequests;
  }

  get batchTotalCost(): number {
    return this.totalCost * this.batchRequests;
  }
}
