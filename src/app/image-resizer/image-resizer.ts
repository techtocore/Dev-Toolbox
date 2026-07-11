import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

type OutputFormat = 'png' | 'jpeg' | 'webp';

@Component({
  selector: 'app-image-resizer',
  standalone: false,
  templateUrl: './image-resizer.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-resizer.scss',
})
export class ImageResizer implements OnDestroy {
  /** Maximum accepted file size (25 MB) to keep canvas work responsive. */
  private static readonly MAX_BYTES = 25 * 1024 * 1024;
  /** Keep RGBA canvas allocation near 160 MB before browser overhead. */
  private static readonly MAX_OUTPUT_PIXELS = 40_000_000;

  /** Object URL of the currently-loaded source image (revoked on replace). */
  previewUrl: string | null = null;
  /** Object URL of the most recent processed result (for the result preview). */
  resultUrl: string | null = null;

  fileName = '';
  originalWidth = 0;
  originalHeight = 0;
  originalBytes = 0;

  /** Target output dimensions (px). */
  targetWidth = 0;
  targetHeight = 0;
  lockAspect = true;

  format: OutputFormat = 'png';
  /** Quality for lossy formats (JPEG/WebP). Ignored for PNG. */
  quality = 0.9;

  // Result metrics (populated after a successful process).
  outputWidth = 0;
  outputHeight = 0;
  outputBytes = 0;
  hasResult = false;

  isProcessing = false;
  errorMessage = '';

  /** The decoded source image, kept so processing doesn't need to reload. */
  private sourceImage: HTMLImageElement | null = null;
  private aspectRatio = 1;

  /** Monotonic token so a stale decode can't clobber a newer load. */
  private loadSeq = 0;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  // ---- Dropzone handlers -------------------------------------------------

  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const fs = e.dataTransfer?.files;
    if (fs?.length) {
      this.handleFiles(fs);
    }
  }

  onPick(e: Event): void {
    const i = e.target as HTMLInputElement;
    if (i.files?.length) {
      this.handleFiles(i.files);
    }
    i.value = '';
  }

  private handleFiles(files: FileList): void {
    const file = files[0];
    this.errorMessage = '';

    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      this.errorMessage = 'Please choose a raster image (PNG, JPEG, WebP, GIF, or BMP).';
      return;
    }
    if (file.size > ImageResizer.MAX_BYTES) {
      this.errorMessage = 'Image is too large (max 25 MB).';
      return;
    }

    void this.loadImage(file);
  }

  private async loadImage(file: File): Promise<void> {
    // Replace any previously-loaded preview/result and revoke their URLs.
    this.revokePreview();
    this.revokeResult();
    this.hasResult = false;
    this.sourceImage = null;

    const seq = ++this.loadSeq;
    const url = URL.createObjectURL(file);
    try {
      const img = await this.decode(url);
      // A newer load started while we were decoding — drop this stale result.
      if (seq !== this.loadSeq) {
        URL.revokeObjectURL(url);
        return;
      }
      // Reject vector/SVG or otherwise zero-sized images: a 0×0 source would
      // clamp to a silent 1×1 output and a misleading success toast.
      if (!img.naturalWidth || !img.naturalHeight) {
        throw new Error('This image has no usable pixel dimensions (vector/SVG images are not supported).');
      }
      this.previewUrl = url;
      this.sourceImage = img;
      this.fileName = file.name;
      this.originalWidth = img.naturalWidth;
      this.originalHeight = img.naturalHeight;
      this.originalBytes = file.size;
      this.format = file.type === 'image/jpeg'
        ? 'jpeg'
        : file.type === 'image/webp'
          ? 'webp'
          : 'png';
      this.aspectRatio =
        img.naturalHeight === 0 ? 1 : img.naturalWidth / img.naturalHeight;

      this.targetWidth = img.naturalWidth;
      this.targetHeight = img.naturalHeight;
    } catch (err: any) {
      URL.revokeObjectURL(url);
      // Don't let a stale error clobber a newer successful load.
      if (seq === this.loadSeq) {
        this.errorMessage =
          err?.message || 'Could not read that image. It may be corrupt or unsupported.';
      }
    }
  }

  private decode(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode failed'));
      img.src = url;
    });
  }

  // ---- Dimension controls ------------------------------------------------

  onWidthChange(): void {
    this.targetWidth = this.clampDim(this.targetWidth);
    if (this.lockAspect && this.aspectRatio > 0) {
      this.targetHeight = Math.max(1, Math.round(this.targetWidth / this.aspectRatio));
    }
    this.onSettingsChange();
  }

  onHeightChange(): void {
    this.targetHeight = this.clampDim(this.targetHeight);
    if (this.lockAspect && this.aspectRatio > 0) {
      this.targetWidth = Math.max(1, Math.round(this.targetHeight * this.aspectRatio));
    }
    this.onSettingsChange();
  }

  onLockToggle(): void {
    // When (re-)locking, snap height to the current width so the ratio is exact.
    if (this.lockAspect && this.aspectRatio > 0) {
      this.targetHeight = Math.max(1, Math.round(this.targetWidth / this.aspectRatio));
    }
    this.onSettingsChange();
  }

  setScale(percent: number): void {
    if (!this.originalWidth || !this.originalHeight) {
      return;
    }
    const scale = Math.max(1, Math.min(100, percent)) / 100;
    this.targetWidth = Math.max(1, Math.round(this.originalWidth * scale));
    this.targetHeight = Math.max(1, Math.round(this.originalHeight * scale));
    this.onSettingsChange();
  }

  onSettingsChange(): void {
    this.revokeResult();
    this.hasResult = false;
  }

  private clampDim(value: number): number {
    if (!value || value < 1 || isNaN(value)) {
      return 1;
    }
    // Guard against absurd canvases.
    return Math.min(Math.round(value), 20000);
  }

  /** Lossy formats expose the quality slider; PNG is always lossless. */
  get isLossy(): boolean {
    return this.format === 'jpeg' || this.format === 'webp';
  }

  get isOutputSizeSafe(): boolean {
    const width = this.clampDim(this.targetWidth);
    const height = this.clampDim(this.targetHeight);
    return width * height <= ImageResizer.MAX_OUTPUT_PIXELS;
  }

  // ---- Processing --------------------------------------------------------

  async process(): Promise<void> {
    if (!this.sourceImage) {
      this.errorMessage = 'Load an image first.';
      return;
    }
    this.errorMessage = '';
    this.isProcessing = true;

    try {
      const w = this.clampDim(this.targetWidth);
      const h = this.clampDim(this.targetHeight);
      if (w * h > ImageResizer.MAX_OUTPUT_PIXELS) {
        throw new Error('Output is larger than 40 megapixels. Reduce the width or height.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas is not supported in this browser.');
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // JPEG has no alpha — paint a white backdrop so transparency isn't black.
      if (this.format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(this.sourceImage, 0, 0, w, h);

      const mime = `image/${this.format}`;
      const blob = await this.toBlob(canvas, mime, this.isLossy ? this.quality : undefined);
      if (!blob) {
        throw new Error('This browser could not encode to the selected format.');
      }
      // Per the canvas spec, an unsupported type silently falls back to PNG. Catch
      // that so we don't hand back a PNG mislabeled as .webp with bogus metrics.
      if (blob.type !== mime) {
        throw new Error(`This browser cannot encode ${this.format.toUpperCase()}. Try PNG or JPEG.`);
      }

      // Refresh the result preview + metrics.
      this.revokeResult();
      this.resultUrl = URL.createObjectURL(blob);
      this.outputWidth = w;
      this.outputHeight = h;
      this.outputBytes = blob.size;
      this.hasResult = true;

      const ext = this.format === 'jpeg' ? 'jpg' : this.format;
      const base = this.baseName(this.fileName);
      this.utilityService.downloadBlob(blob, `${base}-${w}x${h}.${ext}`);
      this.toastService.success('Image processed');
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to process image.';
    } finally {
      this.isProcessing = false;
    }
  }

  private toBlob(
    canvas: HTMLCanvasElement,
    mime: string,
    quality?: number
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
  }

  private baseName(name: string): string {
    if (!name) {
      return 'image';
    }
    const dot = name.lastIndexOf('.');
    return (dot > 0 ? name.slice(0, dot) : name) || 'image';
  }

  // ---- Derived display helpers ------------------------------------------

  /** Signed percentage change of output size vs original (negative = smaller). */
  get sizeChangePercent(): number {
    if (!this.originalBytes || !this.hasResult) {
      return 0;
    }
    return ((this.outputBytes - this.originalBytes) / this.originalBytes) * 100;
  }

  get sizeChangeLabel(): string {
    const pct = this.sizeChangePercent;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  get sizeIncreased(): boolean {
    return this.sizeChangePercent > 0;
  }

  formatBytes(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  }

  clearAll(): void {
    this.revokePreview();
    this.revokeResult();
    this.sourceImage = null;
    this.fileName = '';
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.originalBytes = 0;
    this.targetWidth = 0;
    this.targetHeight = 0;
    this.outputWidth = 0;
    this.outputHeight = 0;
    this.outputBytes = 0;
    this.hasResult = false;
    this.errorMessage = '';
  }

  private revokePreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  private revokeResult(): void {
    if (this.resultUrl) {
      URL.revokeObjectURL(this.resultUrl);
      this.resultUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
    this.revokeResult();
  }
}
