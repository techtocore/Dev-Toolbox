import { Injectable } from '@angular/core';
import { LocalModel, LOCAL_MODELS, findModel, DEFAULT_MODEL_ID } from './model-registry';

/**
 * Hardware & environment capability report.
 *
 * Centralizes everything we can learn about the device so the AI subsystem can
 * (a) refuse gracefully when a model cannot run, and (b) recommend a model that
 * fits, and (c) warn the user before a large download on a metered connection.
 */
export interface CapabilityReport {
  /** WebGPU API present AND a usable adapter was obtained. */
  webgpu: boolean;
  /** Plain-language reason when `webgpu` is false. */
  webgpuReason?: string;
  /** Approximate device memory in GB (navigator.deviceMemory), if exposed. */
  deviceMemoryGb?: number;
  /** Logical CPU cores. */
  cpuCores?: number;
  /** Likely a phone/tablet. */
  mobile: boolean;
  /** Network is flagged data-saving or slow (metered-ish). */
  saveData: boolean;
  /** effectiveType from the Network Information API, e.g. '4g'. */
  connectionType?: string;
  /** Largest single GPU buffer the adapter allows, bytes (if available). */
  maxBufferBytes?: number;
}

interface NavigatorConnection {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
}
interface GpuAdapterLike {
  limits?: { maxBufferSize?: number; maxStorageBufferBindingSize?: number };
}
interface GpuLike {
  requestAdapter(): Promise<GpuAdapterLike | null>;
}

/** A fit assessment of a specific model against the detected hardware. */
export interface ModelFit {
  /** Safe to attempt. */
  ok: boolean;
  /** Non-fatal advisory (e.g. tight on memory, large download on metered net). */
  warning?: string;
  /** Fatal reason the model should not be attempted. */
  blocker?: string;
}

@Injectable({ providedIn: 'root' })
export class CapabilitiesService {
  private cached: CapabilityReport | null = null;

  /** Synchronous cheap check, safe to call from a template guard. */
  hasWebGpuApi(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  /** Full probe; cached after first run. */
  async detect(force = false): Promise<CapabilityReport> {
    if (this.cached && !force) {
      return this.cached;
    }

    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    const connection = (nav as (Navigator & { connection?: NavigatorConnection }) | undefined)
      ?.connection;

    const report: CapabilityReport = {
      webgpu: false,
      deviceMemoryGb: (nav as (Navigator & { deviceMemory?: number }) | undefined)?.deviceMemory,
      cpuCores: nav?.hardwareConcurrency,
      mobile: this.detectMobile(nav),
      saveData: connection?.saveData === true,
      connectionType: connection?.effectiveType,
    };

    if (!nav || !('gpu' in nav)) {
      report.webgpuReason =
        'WebGPU is not available in this browser. Use a recent version of ' +
        'Chrome, Edge, or Safari 18+. Firefox may need it enabled via flags.';
      this.cached = report;
      return report;
    }

    try {
      const gpu = (nav as Navigator & { gpu: GpuLike }).gpu;
      const adapter = await gpu.requestAdapter();
      if (!adapter) {
        report.webgpuReason =
          'WebGPU is present but no compatible GPU adapter was found. Your GPU ' +
          'may be blocklisted, or hardware acceleration may be disabled.';
      } else {
        report.webgpu = true;
        report.maxBufferBytes =
          adapter.limits?.maxBufferSize ?? adapter.limits?.maxStorageBufferBindingSize;
      }
    } catch (err) {
      report.webgpuReason =
        'WebGPU initialization failed: ' +
        (err instanceof Error ? err.message : String(err));
    }

    this.cached = report;
    return report;
  }

  /**
   * Recommends the best-fitting model for the detected hardware: the largest
   * model whose memory requirement is satisfied, biased smaller on mobile.
   */
  async recommendModel(): Promise<LocalModel> {
    const report = await this.detect();
    const mem = report.deviceMemoryGb;

    // Without a memory hint, trust the curated default.
    if (mem == null) {
      return findModel(DEFAULT_MODEL_ID) ?? LOCAL_MODELS[0];
    }

    const candidates = LOCAL_MODELS.filter((m) => {
      if (report.mobile && !m.lowResource) {
        return false; // on mobile recommend only low-resource models (matches assess())
      }
      return mem >= m.minMemoryGb;
    });

    if (!candidates.length) {
      // Nothing comfortably fits — fall back to the smallest model.
      return [...LOCAL_MODELS].sort((a, b) => a.vramMb - b.vramMb)[0];
    }
    // Prefer the most capable that still fits.
    return candidates.sort((a, b) => b.vramMb - a.vramMb)[0];
  }

  /** Assesses whether a given model is advisable on this device. */
  async assess(model: LocalModel): Promise<ModelFit> {
    const report = await this.detect();

    if (!report.webgpu) {
      return { ok: false, blocker: report.webgpuReason ?? 'WebGPU is unavailable.' };
    }

    const fit: ModelFit = { ok: true };
    const warnings: string[] = [];

    if (report.deviceMemoryGb != null && report.deviceMemoryGb < model.minMemoryGb) {
      warnings.push(
        `This device reports ~${report.deviceMemoryGb} GB of memory; ` +
          `${model.label} works best with ${model.minMemoryGb} GB+. It may run ` +
          `slowly or fail to load.`,
      );
    }
    if (report.mobile && !model.lowResource) {
      warnings.push('This looks like a mobile device; a smaller model is recommended.');
    }
    if (report.saveData) {
      warnings.push(
        `Data Saver is on and this is a one-time ${model.downloadSize} download.`,
      );
    } else if (report.connectionType && /(^|\b)(2g|3g|slow-2g)\b/.test(report.connectionType)) {
      warnings.push(
        `Your connection looks slow (${report.connectionType}); the ${model.downloadSize} ` +
          `download may take a while.`,
      );
    }

    if (warnings.length) {
      fit.warning = warnings.join(' ');
    }
    return fit;
  }

  private detectMobile(nav?: Navigator): boolean {
    if (!nav) {
      return false;
    }
    const uaData = (nav as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
    if (uaData && typeof uaData.mobile === 'boolean') {
      return uaData.mobile;
    }
    return /android|iphone|ipad|ipod|mobile|tablet/i.test(nav.userAgent ?? '');
  }
}
