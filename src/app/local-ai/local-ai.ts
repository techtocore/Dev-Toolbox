import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LlmService } from '../ai/llm.service';
import { ChatMessage, LlmError } from '../ai/llm.types';
import { renderMarkdown, splitThinking } from '../ai/output-parser';
import { AiToolPanel } from '../ai/ai-tool-panel/ai-tool-panel';

interface DisplayMessage {
  role: 'user' | 'assistant';
  /** Plain answer text (reasoning stripped). */
  text: string;
  /** Sanitized HTML, set once a turn completes. */
  html?: string;
  /** Optional chain-of-thought, shown collapsed. */
  thinking?: string;
}

/**
 * Local AI chat — a thin tool built entirely on the shared AI foundation.
 * All model lifecycle/hardware concerns live in AiToolPanel + LlmService; this
 * component only owns the conversation UI.
 */
@Component({
  selector: 'app-local-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, AiToolPanel],
  templateUrl: './local-ai.html',
  styleUrl: './local-ai.scss',
})
export class LocalAi {
  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLElement>;

  messages: DisplayMessage[] = [];
  prompt = '';
  generating = false;
  private abort?: AbortController;

  constructor(public llm: LlmService) {}

  get canSend(): boolean {
    return this.prompt.trim().length > 0 && !this.generating && this.llm.isReady();
  }

  async send(): Promise<void> {
    const content = this.prompt.trim();
    if (!content || this.generating) {
      return;
    }
    this.prompt = '';
    this.messages.push({ role: 'user', text: content, html: renderMarkdown(content) });
    const assistant: DisplayMessage = { role: 'assistant', text: '' };
    this.messages.push(assistant);
    this.generating = true;
    this.abort = new AbortController();
    this.scrollSoon();

    const history: ChatMessage[] = this.messages
      .filter((m) => m === assistant ? false : true)
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const result = await this.llm.chat(history, {
        signal: this.abort.signal,
        onToken: (_delta, full) => {
          const split = splitThinking(full);
          assistant.text = split.text;
          assistant.thinking = split.thinking;
          this.scrollSoon();
        },
      });
      assistant.text = result.text;
      assistant.thinking = result.thinking;
      assistant.html = renderMarkdown(result.text);
    } catch (err) {
      const e = err as LlmError;
      if (e?.kind === 'aborted') {
        assistant.text = assistant.text || '_(stopped)_';
        assistant.html = renderMarkdown(assistant.text);
      } else {
        assistant.text = e?.message ?? 'Something went wrong.';
        assistant.html = renderMarkdown(`⚠️ ${assistant.text}`);
      }
    } finally {
      this.generating = false;
      this.abort = undefined;
      this.scrollSoon();
    }
  }

  stop(): void {
    this.abort?.abort();
  }

  clear(): void {
    if (this.generating) {
      this.stop();
    }
    this.messages = [];
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  private scrollSoon(): void {
    queueMicrotask(() =>
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    );
  }
}
