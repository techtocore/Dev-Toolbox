import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LlmService } from '../llm.service';
import { CapabilitiesService } from '../capabilities.service';
import { DEFAULT_MODEL_ID, findModel, LOCAL_MODELS } from '../model-registry';
import { LlmError } from '../llm.types';
import { renderMarkdown, splitThinking } from '../output-parser';
import { UtilityService } from '../../services/utility.service';

let _uid = 0;

/**
 * AiAssist — a reusable, opt-in "AI co-pilot" panel that any existing tool can
 * drop in to gain a local-LLM capability without being rebuilt around it.
 *
 * Design goals (why this exists alongside AiToolPanel):
 *  - **Non-blocking.** AiToolPanel gates an *entire* tool behind a model load —
 *    right for the dedicated chat tool, wrong for augmenting a tool that already
 *    works perfectly offline. AiAssist is collapsed by default and never blocks
 *    the host tool; users who don't want AI (or lack WebGPU) are unaffected.
 *  - **Reusable.** It owns all the fiddly chrome — capability probing, model
 *    pick/download/progress, streaming, abort, errors, copy — so each tool only
 *    supplies a system prompt and decides what to do with the result.
 *  - **Two shapes.** `showComposer` (the user types a request) covers
 *    NL→regex / NL→SQL / describe→schema; the state-driven mode (an external
 *    `inputText`) covers "rewrite my prompt" and "explain my data".
 *
 * The host listens to `(apply)` to consume the cleaned result, or just lets the
 * panel render it (e.g. markdown insights).
 */
@Component({
  selector: 'app-ai-assist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assist.html',
  styleUrl: './ai-assist.scss',
})
export class AiAssist implements OnInit {
  /** Title shown on the disclosure header. */
  @Input() heading = 'Generate with AI';
  /** Bootstrap icon class for the header + action button. */
  @Input() icon = 'bi-stars';
  /** Optional one-line helper under the header. */
  @Input() description?: string;
  /** System instruction that defines the task for the model. */
  @Input() system = '';
  /** Placeholder for the composer textarea. */
  @Input() placeholder = 'Describe what you want…';
  /** Primary button label. */
  @Input() actionLabel = 'Generate';
  /** When set, an "Apply" button appears that emits the result to the host. */
  @Input() applyLabel?: string;
  /** Quick-fill example requests (composer mode only). */
  @Input() examples: string[] = [];
  /** True: user types a request. False: generate from `inputText` (host state). */
  @Input() showComposer = true;
  /** Host-supplied input used when `showComposer` is false. */
  @Input() inputText = '';
  /** Shown (non-composer mode) when `inputText` is empty. */
  @Input() emptyInputMessage = 'Add some input first, then generate.';
  /** Ask the model for strict JSON (hosts then parse with extractJson). */
  @Input() json = false;
  /** Render the result as Markdown instead of plain/monospace text. */
  @Input() renderResultMarkdown = false;
  /** Render the result in a monospaced block (code/regex/SQL/JSON). */
  @Input() monospaceResult = false;
  /** Label above the result block. */
  @Input() resultLabel = 'AI result';
  /** Per-task sampling override (lower = more deterministic). */
  @Input() temperature?: number;
  /** Per-task output cap. */
  @Input() maxTokens?: number;
  /** Start with the panel open. */
  @Input() startExpanded = false;

  /** Emits the cleaned result text when the user clicks Apply. */
  @Output() apply = new EventEmitter<string>();
  /** Emits the cleaned result text when a generation finishes successfully. */
  @Output() completed = new EventEmitter<string>();

  /** Unique id so multiple instances get distinct aria/control ids. */
  readonly uid = ++_uid;
  readonly models = LOCAL_MODELS;

  expanded = false;
  showAdvanced = false;
  composer = '';
  selectedModelId = DEFAULT_MODEL_ID;

  /** null = not probed yet, true/false = WebGPU availability. */
  webgpu: boolean | null = null;
  webgpuReason = '';

  generating = false;
  output = '';
  outputHtml = '';
  thinking = '';
  errorMsg = '';
  aborted = false;

  private abort?: AbortController;
  private probed = false;

  constructor(
    public llm: LlmService,
    private capabilities: CapabilitiesService,
    private utility: UtilityService,
  ) {}

  ngOnInit(): void {
    this.expanded = this.startExpanded;
    if (this.expanded) {
      void this.probe();
    }
  }

  async toggle(): Promise<void> {
    this.expanded = !this.expanded;
    if (this.expanded) {
      await this.probe();
    }
  }

  /** One-time hardware probe + sensible default model selection. */
  private async probe(): Promise<void> {
    if (this.probed) {
      return;
    }
    this.probed = true;
    try {
      const report = await this.capabilities.detect();
      this.webgpu = report.webgpu;
      this.webgpuReason = report.webgpuReason ?? '';
      // Reuse an already-loaded model so opening AI in a second tool never
      // triggers a surprise re-download.
      const loaded = this.llm.currentModelId();
      if (loaded && this.llm.isReady()) {
        this.selectedModelId = loaded;
      } else {
        this.selectedModelId = (await this.capabilities.recommendModel()).id;
      }
    } catch {
      // Probe failure shouldn't break the panel; treat as "unknown but allow".
      this.webgpu = this.capabilities.hasWebGpuApi() ? true : false;
    }
  }

  // ---- Derived view state ---------------------------------------------------
  get selectedModel() {
    return findModel(this.selectedModelId);
  }
  get modelLabel(): string {
    return this.selectedModel?.label ?? 'Model';
  }
  get downloadedSelected(): boolean {
    return this.llm.isDownloaded(this.selectedModelId);
  }
  get currentInput(): string {
    return this.showComposer ? this.composer : this.inputText;
  }
  get canGenerate(): boolean {
    return !this.generating && this.webgpu !== false && this.currentInput.trim().length > 0;
  }
  /** True while *this* generation is still downloading/compiling the model. */
  get isLoadingModel(): boolean {
    return this.generating && this.llm.status() === 'loading';
  }
  get isStreaming(): boolean {
    return this.generating && this.llm.status() === 'generating';
  }
  get progressPercent(): number {
    return Math.round(this.llm.progress() * 100);
  }

  fillExample(example: string): void {
    this.composer = example;
  }

  onKeydown(event: KeyboardEvent): void {
    // Ctrl/Cmd+Enter submits; plain Enter inserts a newline (multi-line input).
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void this.generate();
    }
  }

  async generate(): Promise<void> {
    const prompt = this.currentInput.trim();
    if (!prompt || this.generating) {
      return;
    }

    this.generating = true;
    this.aborted = false;
    this.errorMsg = '';
    this.output = '';
    this.outputHtml = '';
    this.thinking = '';
    this.abort = new AbortController();

    try {
      const result = await this.llm.run(prompt, {
        system: this.system.trim() || undefined,
        modelId: this.selectedModelId,
        json: this.json,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        signal: this.abort.signal,
        onToken: (_delta, full) => {
          // Strip any <think> block live so the panel never flashes raw tags.
          const split = splitThinking(full);
          this.output = split.text;
          this.thinking = split.thinking ?? '';
        },
      });
      this.output = result.text;
      this.thinking = result.thinking ?? '';
      if (this.renderResultMarkdown) {
        this.outputHtml = renderMarkdown(result.text);
      }
      this.completed.emit(result.text);
    } catch (raw) {
      const err = raw as LlmError;
      if (err?.kind === 'aborted') {
        this.aborted = true;
      } else if (err?.kind === 'unsupported') {
        this.webgpu = false;
        this.webgpuReason = err.message;
      } else {
        this.errorMsg = err?.message ?? 'Something went wrong while generating.';
      }
    } finally {
      this.generating = false;
      this.abort = undefined;
    }
  }

  stop(): void {
    this.abort?.abort();
  }

  applyResult(): void {
    if (this.output.trim()) {
      this.apply.emit(this.output.trim());
    }
  }

  copyResult(): void {
    if (this.output.trim()) {
      void this.utility.copyToClipboard(this.output, { label: 'AI output copied' });
    }
  }
}
