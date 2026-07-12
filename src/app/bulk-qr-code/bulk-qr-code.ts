import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

type QrOutputFormat = 'png' | 'svg';
type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

interface QrOutput {
  name: string;
  data: Uint8Array;
}

@Component({
  selector: 'app-bulk-qr-code',
  standalone: false,
  templateUrl: './bulk-qr-code.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './bulk-qr-code.scss',
})
export class BulkQrCode {
  private static readonly MAX_FILE_BYTES = 5 * 1024 * 1024;
  private static readonly MAX_ROWS = 500;
  private static readonly MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

  fileName = '';
  headers: string[] = [];
  rows: string[][] = [];
  payloadColumn = 0;
  nameColumn: number | null = null;

  outputFormat: QrOutputFormat = 'png';
  size = 256;
  errorCorrectionLevel: ErrorCorrection = 'M';
  margin = 4;

  isGenerating = false;
  processedCount = 0;
  generatedCount = 0;
  errorMessage = '';

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  get validRowCount(): number {
    return this.rows.filter(row => (row[this.payloadColumn] || '').trim()).length;
  }

  get previewRows(): string[][] {
    return this.rows.slice(0, 5);
  }

  get progressPercent(): number {
    if (!this.validRowCount) {
      return 0;
    }
    return Math.round((this.processedCount / this.validRowCount) * 100);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file && !this.isGenerating) {
      void this.loadFile(file);
    }
  }

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && !this.isGenerating) {
      void this.loadFile(file);
    }
    input.value = '';
  }

  async loadFile(file: File): Promise<void> {
    this.clearData();
    if (!/\.(csv|tsv)$/i.test(file.name)) {
      this.errorMessage = 'Choose a CSV or TSV file.';
      return;
    }
    if (!file.size) {
      this.errorMessage = 'That file is empty.';
      return;
    }
    if (file.size > BulkQrCode.MAX_FILE_BYTES) {
      this.errorMessage = 'That file is larger than 5 MB.';
      return;
    }

    try {
      const delimiter = /\.tsv$/i.test(file.name) ? '\t' : ',';
      this.parseTable(await file.text(), delimiter);
      this.fileName = file.name;
      this.toastService.info(`Loaded ${this.rows.length} data row(s)`);
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error ? error.message : 'Could not read that file.';
    }
  }

  parseTable(text: string, delimiter = ','): void {
    const table = this.utilityService.parseCsv(text, delimiter);
    if (table.length < 2) {
      throw new Error('The file needs a header row and at least one data row.');
    }
    if (table.length - 1 > BulkQrCode.MAX_ROWS) {
      throw new Error(`This file has ${table.length - 1} rows. The limit is 500 QR codes per batch.`);
    }

    this.headers = table[0].map((header, index) => header.trim() || `Column ${index + 1}`);
    this.rows = table.slice(1).filter(row => row.some(value => value.trim()));
    if (!this.rows.length) {
      throw new Error('The file has no non-empty data rows.');
    }
    this.payloadColumn = 0;
    this.nameColumn = null;
    this.generatedCount = 0;
    this.errorMessage = '';
  }

  clearData(): void {
    this.fileName = '';
    this.headers = [];
    this.rows = [];
    this.payloadColumn = 0;
    this.nameColumn = null;
    this.processedCount = 0;
    this.generatedCount = 0;
    this.errorMessage = '';
  }

  onMappingChange(): void {
    this.generatedCount = 0;
    this.errorMessage = '';
  }

  onSizeBlur(): void {
    this.size = Math.min(1024, Math.max(128, Math.round(Number(this.size) || 256)));
  }

  async generateZip(): Promise<void> {
    if (!this.validRowCount || this.isGenerating) {
      return;
    }

    this.isGenerating = true;
    this.processedCount = 0;
    this.generatedCount = 0;
    this.errorMessage = '';
    const outputs: QrOutput[] = [];
    const failures: number[] = [];
    const usedNames = new Set<string>();

    try {
      const QRCode = (await import('qrcode')).default;
      const width = Math.min(1024, Math.max(128, Math.round(Number(this.size) || 256)));
      const margin = Math.min(20, Math.max(0, Math.round(Number(this.margin) || 0)));
      const validRows = this.rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => (row[this.payloadColumn] || '').trim());

      for (const { row, index } of validRows) {
        const payload = row[this.payloadColumn].trim();
        try {
          let data: Uint8Array;
          if (this.outputFormat === 'svg') {
            const svg = await QRCode.toString(payload, {
              type: 'svg',
              width,
              margin,
              errorCorrectionLevel: this.errorCorrectionLevel,
            });
            data = new TextEncoder().encode(svg);
          } else {
            const dataUrl = await QRCode.toDataURL(payload, {
              width,
              margin,
              errorCorrectionLevel: this.errorCorrectionLevel,
            });
            data = this.dataUrlToBytes(dataUrl);
          }

          const rawName = this.nameColumn == null
            ? `qr-${String(index + 1).padStart(3, '0')}`
            : row[this.nameColumn] || `qr-${String(index + 1).padStart(3, '0')}`;
          const name = this.makeOutputName(rawName, usedNames);
          outputs.push({ name, data });
          this.generatedCount++;
        } catch {
          failures.push(index + 2);
        } finally {
          this.processedCount++;
        }
      }

      if (!outputs.length) {
        this.errorMessage = 'No QR codes could be generated. Check the selected payload column.';
        return;
      }

      const totalBytes = outputs.reduce((total, output) => total + output.data.length, 0);
      if (totalBytes > BulkQrCode.MAX_ARCHIVE_BYTES) {
        throw new Error('Generated output exceeds the 100 MB archive limit. Reduce the size or row count.');
      }

      const { zipSync } = await import('fflate');
      const entries: Record<string, Uint8Array> = {};
      outputs.forEach(output => entries[output.name] = output.data);
      const archive = zipSync(entries, { level: this.outputFormat === 'png' ? 0 : 6 });
      this.utilityService.downloadBlob(
        new Blob([archive as BlobPart], { type: 'application/zip' }),
        'qr-codes.zip'
      );

      if (failures.length) {
        this.errorMessage = `Generated ${outputs.length} of ${validRows.length}. Failed CSV row(s): ${failures.join(', ')}.`;
      }
      this.toastService.success(`Downloaded ${outputs.length} QR code(s)`);
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error
        ? `Could not generate the QR archive: ${error.message}`
        : 'Could not generate the QR archive.';
    } finally {
      this.isGenerating = false;
    }
  }

  makeOutputName(rawName: string, usedNames: Set<string>): string {
    const extension = this.outputFormat;
    const base = rawName.trim().replace(/\.(png|svg)$/i, '') || 'qr';
    let sequence = 1;
    let candidate = this.utilityService.normalizeDownloadName(base, extension, 'qr');
    while (usedNames.has(candidate.toLowerCase())) {
      sequence++;
      candidate = this.utilityService.normalizeDownloadName(`${base}-${sequence}`, extension, 'qr');
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  }

  private dataUrlToBytes(dataUrl: string): Uint8Array {
    const encoded = dataUrl.split(',')[1];
    if (!encoded) {
      throw new Error('Could not encode PNG output.');
    }
    const binary = atob(encoded);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }
}