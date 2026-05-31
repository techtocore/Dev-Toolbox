import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LlmService } from '../llm.service';
import { CapabilitiesService, ModelFit } from '../capabilities.service';
import { LOCAL_MODELS, LocalModel, DEFAULT_MODEL_ID, findModel } from '../model-registry';

/**
 * AiToolPanel — the reusable shell that gives every AI tool a consistent,
 * world-class load experience for free.
 *
 * Responsibilities (so individual tools don't reimplement them):
 *  - Probe hardware and block with a clear message when WebGPU is unavailable.
 *  - Offer a model picker, hardware-fit warnings, and a download/compile
 *    progress bar (distinguishing first-time download from cached reload).
 *  - Surface typed errors with a retry affordance.
 *  - Project the tool's own UI via `<ng-content>` once a model is ready.
 *
 * Usage:
 *   <app-ai-tool-panel [autoLoad]="false" (ready)="onReady()">
 *     ...your tool UI here (rendered only when a model is ready)...
 *   </app-ai-tool-panel>
 */
@Component({
  selector: 'app-ai-tool-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-tool-panel.html',
  styleUrl: './ai-tool-panel.scss',
})
export class AiToolPanel implements OnInit {
  /** Preselect a specific model id. Defaults to the curated recommendation. */
  @Input() preferredModelId?: string;
  /** Begin loading immediately once a model is chosen. */
  @Input() autoLoad = false;
  /** Emitted whenever a model becomes ready. */
  @Output() ready = new EventEmitter<string>();

  readonly models = LOCAL_MODELS;
  selectedModelId = DEFAULT_MODEL_ID;
  readonly fit = signal<ModelFit | null>(null);

  constructor(
    public llm: LlmService,
    private capabilities: CapabilitiesService,
  ) {}

  async ngOnInit(): Promise<void> {
    // Pick a sensible default for this device unless the host overrode it.
    const recommended = await this.capabilities.recommendModel();
    this.selectedModelId = this.preferredModelId ?? recommended.id;

    const report = await this.capabilities.detect();
    if (!report.webgpu) {
      // Reflect unsupported state so the gate renders without a load attempt.
      this.llm.status.set('unsupported');
      this.llm.error.set(
        new (await import('../llm.types')).LlmError(
          'unsupported',
          report.webgpuReason ?? 'WebGPU is unavailable.',
        ),
      );
      return;
    }

    await this.refreshFit();
    if (this.autoLoad) {
      void this.load();
    }
  }

  get selectedModel(): LocalModel | undefined {
    return findModel(this.selectedModelId);
  }

  get isLoading(): boolean {
    return this.llm.status() === 'loading';
  }
  get isUnsupported(): boolean {
    return this.llm.status() === 'unsupported';
  }
  get isReady(): boolean {
    return this.llm.isReady();
  }
  get hasError(): boolean {
    return this.llm.status() === 'error';
  }
  get progressPercent(): number {
    return Math.round(this.llm.progress() * 100);
  }
  get downloadedSelected(): boolean {
    return this.llm.isDownloaded(this.selectedModelId);
  }

  async onModelChange(): Promise<void> {
    await this.refreshFit();
  }

  private async refreshFit(): Promise<void> {
    const model = this.selectedModel;
    this.fit.set(model ? await this.capabilities.assess(model) : null);
  }

  async load(): Promise<void> {
    try {
      await this.llm.ensureLoaded(this.selectedModelId);
      this.ready.emit(this.selectedModelId);
    } catch {
      // Error is reflected via llm.error(); the template shows retry.
    }
  }
}
