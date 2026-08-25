import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

type OutputFormat = 'png' | 'jpeg' | 'webp';
type ConversionStatus = 'ready' | 'converting' | 'done' | 'error';
type AnimationInspection = 'animated' | 'static' | 'unknown';

export interface ConversionItem {
  file: File;
  name: string;
  url: string;
  status: ConversionStatus;
  outputBytes: number;
  error: string;
  animated?: boolean;
  animationCheckFailed?: boolean;
}

interface ConversionOutput {
  name: string;
  blob: Blob;
}

const ACCEPTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/x-ms-bmp',
]);

@Component({
  selector: 'app-image-format-converter',
  standalone: false,
  templateUrl: './image-format-converter.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-format-converter.scss',
})
export class ImageFormatConverter implements OnDestroy {
  private static readonly MAX_FILE_BYTES = 25 * 1024 * 1024;
  private static readonly MAX_OUTPUT_PIXELS = 40_000_000;
  private static readonly MAX_FILES = 100;
  private static readonly MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
  private static readonly ANIMATION_SCAN_BYTES = 1024 * 1024;

  items: ConversionItem[] = [];
  format: OutputFormat = 'webp';
  quality = 0.85;
  isConverting = false;
  processedCount = 0;
  errorMessage = '';

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  get isLossy(): boolean {
    return this.format === 'jpeg' || this.format === 'webp';
  }

  get hasAnimatedInput(): boolean {
    return this.items.some(item => item.animated);
  }

  get animationDetectionIncomplete(): boolean {
    return this.items.some(item => item.animationCheckFailed);
  }

  get completedCount(): number {
    return this.items.filter(item => item.status === 'done').length;
  }

  get totalOutputBytes(): number {
    return this.items.reduce((total, item) => total + item.outputBytes, 0);
  }

  get progressPercent(): number {
    if (!this.items.length) {
      return 0;
    }
    return Math.round((this.processedCount / this.items.length) * 100);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!this.isConverting && event.dataTransfer?.files.length) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.isConverting && input.files?.length) {
      this.handleFiles(input.files);
    }
    input.value = '';
  }

  private handleFiles(files: FileList): void {
    this.errorMessage = '';
    this.resetResults();
    const rejected: string[] = [];

    for (const file of Array.from(files)) {
      if (this.items.length >= ImageFormatConverter.MAX_FILES) {
        rejected.push(`${file.name} (100-file limit reached)`);
        continue;
      }
      if (!ACCEPTED_TYPES.has(file.type)) {
        rejected.push(`${file.name} (unsupported format)`);
        continue;
      }
      if (!file.size) {
        rejected.push(`${file.name} (empty file)`);
        continue;
      }
      if (file.size > ImageFormatConverter.MAX_FILE_BYTES) {
        rejected.push(`${file.name} (over 25 MB)`);
        continue;
      }
      if (this.items.some(item => this.fileKey(item.file) === this.fileKey(file))) {
        rejected.push(`${file.name} (already added)`);
        continue;
      }

      const item: ConversionItem = {
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        status: 'ready',
        outputBytes: 0,
        error: '',
        animated: file.type === 'image/gif',
      };
      this.items.push(item);
      if (file.type === 'image/png' || file.type === 'image/webp') {
        void this.detectAnimation(item);
      }
    }

    if (rejected.length) {
      this.errorMessage = `Skipped ${rejected.length} file(s): ${rejected.join(', ')}`;
    }
  }

  remove(index: number): void {
    const [removed] = this.items.splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    this.resetResults();
    this.errorMessage = '';
  }

  clearAll(): void {
    this.items.forEach(item => URL.revokeObjectURL(item.url));
    this.items = [];
    this.processedCount = 0;
    this.errorMessage = '';
  }

  sortByName(): void {
    this.items.sort((left, right) => left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }));
  }

  resetResults(): void {
    this.processedCount = 0;
    this.items.forEach(item => {
      item.status = 'ready';
      item.outputBytes = 0;
      item.error = '';
    });
  }

  async convertAll(): Promise<void> {
    if (!this.items.length || this.isConverting) {
      return;
    }

    this.errorMessage = '';
    this.resetResults();
    this.isConverting = true;
    const outputs: ConversionOutput[] = [];
    const usedNames = new Set<string>();

    try {
      for (const item of this.items) {
        item.status = 'converting';
        try {
          const blob = await this.convertItem(item);
          const batchBytes = outputs.reduce((total, output) => total + output.blob.size, 0);
          if (this.items.length > 1 && batchBytes + blob.size > ImageFormatConverter.MAX_ARCHIVE_BYTES) {
            throw new Error('Batch output exceeds the 200 MB ZIP limit. Convert fewer images at once.');
          }
          const name = this.makeOutputName(item.name, usedNames);
          item.status = 'done';
          item.outputBytes = blob.size;
          outputs.push({ name, blob });
        } catch (error: unknown) {
          item.status = 'error';
          item.error = error instanceof Error ? error.message : 'Conversion failed.';
        } finally {
          this.processedCount++;
        }
      }

      if (!outputs.length) {
        this.errorMessage = 'None of the selected images could be converted.';
        return;
      }

      if (this.items.length === 1) {
        this.utilityService.downloadBlob(outputs[0].blob, outputs[0].name);
      } else {
        const { zipSync } = await import('fflate');
        const entries: Record<string, Uint8Array> = {};
        for (const output of outputs) {
          entries[output.name] = new Uint8Array(await output.blob.arrayBuffer());
        }
        const archive = zipSync(entries, { level: 0 });
        this.utilityService.downloadBlob(
          new Blob([archive as BlobPart], { type: 'application/zip' }),
          'converted-images.zip'
        );
      }

      const failed = this.items.length - outputs.length;
      if (failed) {
        this.errorMessage = `Converted ${outputs.length} of ${this.items.length} images. Check the failed items below.`;
      }
      this.toastService.success(
        this.items.length === 1
          ? 'Converted image downloaded'
          : `Downloaded ${outputs.length} converted image(s) as ZIP`
      );
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error
        ? `Could not prepare the download: ${error.message}`
        : 'Could not prepare the converted download.';
    } finally {
      this.isConverting = false;
    }
  }

  makeOutputName(sourceName: string, usedNames: Set<string>): string {
    const extension = this.format === 'jpeg' ? 'jpg' : this.format;
    const dot = sourceName.lastIndexOf('.');
    const base = (dot > 0 ? sourceName.slice(0, dot) : sourceName) || 'image';
    let sequence = 1;
    let candidate = this.utilityService.normalizeDownloadName(base, extension, 'image');

    while (usedNames.has(candidate.toLowerCase())) {
      sequence++;
      candidate = this.utilityService.normalizeDownloadName(
        `${base}-${sequence}`,
        extension,
        'image'
      );
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  }

  formatLabel(mime: string): string {
    const labels: Record<string, string> = {
      'image/png': 'PNG',
      'image/jpeg': 'JPEG',
      'image/webp': 'WebP',
      'image/gif': 'GIF',
      'image/bmp': 'BMP',
      'image/x-ms-bmp': 'BMP',
    };
    return labels[mime] || 'Image';
  }

  formatBytes(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  }

  private async convertItem(item: ConversionItem): Promise<Blob> {
    const image = await this.decode(item.url);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) {
      throw new Error('Image has no usable dimensions.');
    }

    if (width * height > ImageFormatConverter.MAX_OUTPUT_PIXELS) {
      throw new Error('Image exceeds the 40-megapixel conversion limit.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported in this browser.');
    }
    if (this.format === 'jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);

    const mime = `image/${this.format}`;
    const quality = Math.max(0.1, Math.min(1, Number(this.quality) || 0.85));
    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, mime, this.isLossy ? quality : undefined);
    });
    if (!blob || blob.type !== mime) {
      throw new Error(`This browser cannot encode ${this.format.toUpperCase()}.`);
    }
    return blob;
  }

  private async detectAnimation(item: ConversionItem): Promise<void> {
    try {
      const bytes = new Uint8Array(
        await item.file.slice(0, ImageFormatConverter.ANIMATION_SCAN_BYTES).arrayBuffer()
      );
      if (!this.items.includes(item)) {
        return;
      }
      const result = item.file.type === 'image/png'
        ? this.inspectPngAnimation(bytes)
        : this.inspectWebpAnimation(bytes);
      item.animated = result === 'animated';
      item.animationCheckFailed = result === 'unknown';
    } catch {
      if (this.items.includes(item)) {
        item.animationCheckFailed = true;
      }
    }
  }

  private inspectPngAnimation(bytes: Uint8Array): AnimationInspection {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < signature.length
      || signature.some((value, index) => bytes[index] !== value)) {
      return 'unknown';
    }

    let offset = signature.length;
    while (offset + 12 <= bytes.length) {
      const dataLength = this.readUint32(bytes, offset, false);
      const chunkEnd = offset + 12 + dataLength;
      if (chunkEnd > bytes.length) {
        return 'unknown';
      }
      const chunkType = this.readAscii(bytes, offset + 4, 4);
      if (chunkType === 'acTL') {
        return 'animated';
      }
      // APNG requires acTL before the first image-data chunk.
      if (chunkType === 'IDAT' || chunkType === 'IEND') {
        return 'static';
      }
      offset = chunkEnd;
    }
    return 'unknown';
  }

  private inspectWebpAnimation(bytes: Uint8Array): AnimationInspection {
    if (bytes.length < 12
      || this.readAscii(bytes, 0, 4) !== 'RIFF'
      || this.readAscii(bytes, 8, 4) !== 'WEBP') {
      return 'unknown';
    }

    const riffEnd = this.readUint32(bytes, 4, true) + 8;
    let offset = 12;
    while (offset + 8 <= bytes.length && offset < riffEnd) {
      const chunkType = this.readAscii(bytes, offset, 4);
      const dataLength = this.readUint32(bytes, offset + 4, true);
      const chunkEnd = offset + 8 + dataLength + (dataLength % 2);
      if (chunkEnd > bytes.length) {
        return 'unknown';
      }
      if (chunkType === 'VP8X') {
        if (dataLength < 1) {
          return 'unknown';
        }
        return (bytes[offset + 8] & 0x02) !== 0 ? 'animated' : 'static';
      }
      if (chunkType === 'ANIM' || chunkType === 'ANMF') {
        return 'animated';
      }
      if (chunkType === 'VP8 ' || chunkType === 'VP8L') {
        return 'static';
      }
      offset = chunkEnd;
    }
    return offset >= riffEnd ? 'static' : 'unknown';
  }

  private readUint32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
    return new DataView(
      bytes.buffer,
      bytes.byteOffset + offset,
      4
    ).getUint32(0, littleEndian);
  }

  private readAscii(bytes: Uint8Array, offset: number, length: number): string {
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
  }

  private decode(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode this image.'));
      image.src = url;
    });
  }

  private fileKey(file: File): string {
    return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
  }

  ngOnDestroy(): void {
    this.items.forEach(item => URL.revokeObjectURL(item.url));
  }
}