import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

type Operation = 'compress' | 'decompress';
type WrapperFormat = 'gzip' | 'zlib' | 'deflate';
type InputMode = 'text' | 'file';

@Component({
  selector: 'app-deflate-toolkit',
  standalone: false,
  templateUrl: './deflate-toolkit.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './deflate-toolkit.scss',
})
export class DeflateToolkit {
  private static readonly MAX_INPUT_BYTES = 50 * 1024 * 1024;
  private static readonly MAX_OUTPUT_BYTES = 100 * 1024 * 1024;
  private static readonly MAX_PREVIEW_BYTES = 1024 * 1024;

  operation: Operation = 'compress';
  format: WrapperFormat = 'gzip';
  inputMode: InputMode = 'text';
  compressionLevel = 6;

  inputText = '';
  inputBytes: Uint8Array | null = null;
  inputFileName = '';
  inputMime = '';

  outputBytes: Uint8Array | null = null;
  outputFileName = '';
  outputMime = 'application/octet-stream';
  outputPreview = '';
  previewAvailable = false;

  isProcessing = false;
  errorMessage = '';

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  get inputSize(): number {
    return this.inputMode === 'text'
      ? new TextEncoder().encode(this.inputText).length
      : this.inputBytes?.length || 0;
  }

  get outputSize(): number {
    return this.outputBytes?.length || 0;
  }

  get sizeChangeLabel(): string {
    if (!this.inputSize || !this.outputSize) {
      return '0%';
    }
    const percent = ((this.outputSize - this.inputSize) / this.inputSize) * 100;
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  }

  get canProcess(): boolean {
    return !this.isProcessing && this.inputSize > 0;
  }

  setOperation(operation: Operation): void {
    if (this.operation === operation) {
      return;
    }
    this.operation = operation;
    this.inputMode = operation === 'decompress' ? 'file' : 'text';
    this.clearInput();
  }

  setInputMode(mode: InputMode): void {
    if (this.inputMode === mode) {
      return;
    }
    this.inputMode = mode;
    this.clearInput();
  }

  onSettingsChange(): void {
    this.clearOutput();
    this.errorMessage = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file && !this.isProcessing) {
      void this.loadFile(file);
    }
  }

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && !this.isProcessing) {
      void this.loadFile(file);
    }
    input.value = '';
  }

  async loadFile(file: File): Promise<void> {
    this.clearOutput();
    this.errorMessage = '';
    if (!file.size) {
      this.errorMessage = 'That file is empty.';
      return;
    }
    if (file.size > DeflateToolkit.MAX_INPUT_BYTES) {
      this.errorMessage = 'That file is larger than 50 MB.';
      return;
    }

    try {
      this.inputBytes = new Uint8Array(await file.arrayBuffer());
      this.inputFileName = file.name;
      this.inputMime = file.type || 'application/octet-stream';
      this.toastService.info(`Loaded ${file.name}`);
    } catch {
      this.errorMessage = 'Could not read that file.';
    }
  }

  async process(): Promise<void> {
    if (!this.canProcess) {
      return;
    }

    this.isProcessing = true;
    this.clearOutput();
    this.errorMessage = '';
    try {
      const input = this.inputMode === 'text'
        ? new TextEncoder().encode(this.inputText)
        : this.inputBytes!;
      this.outputBytes = this.operation === 'compress'
        ? await this.compress(input)
        : await this.decompress(input);

      this.outputFileName = this.operation === 'compress'
        ? this.compressedFileName()
        : this.decompressedFileName();
      this.outputMime = this.operation === 'compress'
        ? this.wrapperMime()
        : 'application/octet-stream';
      this.buildPreview();
    } catch (error: unknown) {
      this.clearOutput();
      this.errorMessage = error instanceof Error
        ? error.message
        : `${this.operation === 'compress' ? 'Compression' : 'Decompression'} failed.`;
    } finally {
      this.isProcessing = false;
    }
  }

  download(): void {
    if (!this.outputBytes) {
      return;
    }
    this.utilityService.downloadBlob(
      new Blob([this.outputBytes as BlobPart], { type: this.outputMime }),
      this.outputFileName
    );
    this.toastService.success(`Downloaded ${this.outputFileName}`);
  }

  copyPreview(): void {
    if (this.previewAvailable) {
      void this.utilityService.copyToClipboard(this.outputPreview, { label: 'Output copied' });
    }
  }

  clearAll(): void {
    this.clearInput();
  }

  formatBytes(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  }

  private async compress(input: Uint8Array): Promise<Uint8Array> {
    const { deflate, gzip, zlib } = await import('fflate');
    return new Promise((resolve, reject) => {
      const level = Math.min(9, Math.max(0, Math.round(this.compressionLevel))) as
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      const callback = (error: Error | null, data: Uint8Array) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      };

      if (this.format === 'gzip') {
        gzip(input, { level }, callback);
      } else if (this.format === 'zlib') {
        zlib(input, { level }, callback);
      } else {
        deflate(input, { level }, callback);
      }
    });
  }

  private async decompress(input: Uint8Array): Promise<Uint8Array> {
    const { AsyncGunzip, AsyncInflate, AsyncUnzlib } = await import('fflate');
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      let total = 0;
      let settled = false;

      const onData = (error: Error | null, chunk: Uint8Array, final: boolean) => {
        if (settled) {
          return;
        }
        if (error) {
          settled = true;
          stream.terminate();
          reject(new Error(`Could not decompress as ${this.format.toUpperCase()}. Check the selected format.`));
          return;
        }

        total += chunk.length;
        if (total > DeflateToolkit.MAX_OUTPUT_BYTES) {
          settled = true;
          stream.terminate();
          reject(new Error('Decompressed output exceeds the 100 MB safety limit.'));
          return;
        }
        chunks.push(chunk);
        if (final) {
          settled = true;
          const output = new Uint8Array(total);
          let offset = 0;
          chunks.forEach(part => {
            output.set(part, offset);
            offset += part.length;
          });
          resolve(output);
        }
      };

      const stream = this.format === 'gzip'
        ? new AsyncGunzip(onData)
        : this.format === 'zlib'
          ? new AsyncUnzlib(onData)
          : new AsyncInflate(onData);
      stream.push(input.slice(), true);
    });
  }

  private buildPreview(): void {
    this.outputPreview = '';
    this.previewAvailable = false;
    if (this.operation !== 'decompress' || !this.outputBytes || this.outputBytes.length > DeflateToolkit.MAX_PREVIEW_BYTES) {
      return;
    }
    try {
      this.outputPreview = new TextDecoder('utf-8', { fatal: true }).decode(this.outputBytes);
      this.previewAvailable = true;
      this.outputMime = 'text/plain;charset=utf-8';
    } catch {
      this.outputPreview = '';
    }
  }

  private compressedFileName(): string {
    const extension = this.format === 'gzip' ? 'gz' : this.format === 'zlib' ? 'zlib' : 'deflate';
    const source = this.inputMode === 'file' ? this.inputFileName : 'text';
    return this.utilityService.normalizeDownloadName(source, extension, 'compressed');
  }

  private decompressedFileName(): string {
    const stripped = this.inputFileName.replace(/\.(gz|gzip|zlib|zz|deflate)$/i, '');
    const extensionMatch = /\.([a-z0-9]{1,10})$/i.exec(stripped);
    if (extensionMatch) {
      return this.utilityService.normalizeDownloadName(
        stripped.slice(0, -extensionMatch[0].length),
        extensionMatch[1],
        'decompressed'
      );
    }
    return this.utilityService.normalizeDownloadName(
      `${stripped || 'output'}-decompressed`,
      'bin',
      'decompressed'
    );
  }

  private wrapperMime(): string {
    if (this.format === 'gzip') {
      return 'application/gzip';
    }
    return this.format === 'zlib' ? 'application/zlib' : 'application/octet-stream';
  }

  private clearInput(): void {
    this.inputText = '';
    this.inputBytes = null;
    this.inputFileName = '';
    this.inputMime = '';
    this.errorMessage = '';
    this.clearOutput();
  }

  private clearOutput(): void {
    this.outputBytes = null;
    this.outputFileName = '';
    this.outputMime = 'application/octet-stream';
    this.outputPreview = '';
    this.previewAvailable = false;
  }
}