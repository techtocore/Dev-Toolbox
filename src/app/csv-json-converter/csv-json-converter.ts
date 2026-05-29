import { Component } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-csv-json-converter',
  standalone: false,
  templateUrl: './csv-json-converter.html',
  styleUrls: ['./csv-json-converter.scss']
})
export class CsvJsonConverter {
  inputText: string = '';
  outputText: string = '';
  mode: 'csv-to-json' | 'json-to-csv' = 'csv-to-json';

  // CSV options
  delimiter: string = ',';
  hasHeader: boolean = true;

  // JSON options
  prettyPrint: boolean = true;

  // Output options
  jsonFormat: 'array' | 'objects' = 'objects';

  errorMessage: string = '';

  // Stats
  inputBytes = 0;
  outputBytes = 0;
  inputRowCount = 0;
  outputRowCount = 0;

  // Preview
  previewHeaders: string[] = [];
  previewRows: string[][] = [];

  constructor(
    private utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  convert(): void {
    this.errorMessage = '';
    this.outputText = '';
    this.inputBytes = new Blob([this.inputText]).size;

    try {
      if (this.mode === 'csv-to-json') {
        this.outputText = this.csvToJson();
      } else {
        this.outputText = this.jsonToCsv();
      }
      this.outputBytes = new Blob([this.outputText]).size;
      this.buildPreview();
    } catch (error: any) {
      this.errorMessage = error.message || 'Conversion failed';
      this.outputBytes = 0;
      this.previewHeaders = [];
      this.previewRows = [];
    }
  }

  private buildPreview(): void {
    this.previewHeaders = [];
    this.previewRows = [];

    if (this.mode === 'csv-to-json') {
      try {
        const arr = JSON.parse(this.outputText);
        if (!Array.isArray(arr) || arr.length === 0) return;
        if (Array.isArray(arr[0])) {
          this.previewHeaders = arr[0].map((_: any, i: number) => `col${i + 1}`);
          this.previewRows = arr.slice(0, 10).map(row => row.map((v: any) => String(v ?? '')));
        } else if (typeof arr[0] === 'object') {
          this.previewHeaders = Object.keys(arr[0]);
          this.previewRows = arr.slice(0, 10).map((obj: any) =>
            this.previewHeaders.map(h => {
              const v = obj[h];
              if (v == null) return '';
              if (typeof v === 'object') return JSON.stringify(v);
              return String(v);
            })
          );
        }
        this.outputRowCount = arr.length;
      } catch {
        this.previewHeaders = [];
        this.previewRows = [];
      }
    } else {
      const lines = this.outputText.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
      if (lines.length === 0) return;
      const startIdx = this.hasHeader ? 1 : 0;
      this.previewHeaders = this.hasHeader
        ? this.parseCsvLine(lines[0])
        : this.parseCsvLine(lines[0]).map((_, i) => `col${i + 1}`);
      this.previewRows = lines.slice(startIdx, startIdx + 10).map(l => this.parseCsvLine(l));
      this.outputRowCount = this.hasHeader ? lines.length - 1 : lines.length;
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.loadFile(file);
    input.value = '';
  }

  async onFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await this.loadFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async loadFile(file: File): Promise<void> {
    const name = file.name.toLowerCase();
    // Auto-detect mode + delimiter from extension.
    if (name.endsWith('.json')) {
      this.mode = 'json-to-csv';
    } else if (name.endsWith('.tsv')) {
      this.mode = 'csv-to-json';
      this.delimiter = '\t';
    } else {
      this.mode = 'csv-to-json';
      this.delimiter = ',';
    }
    this.inputText = await file.text();
    this.toastService.info(`Loaded ${file.name} (${this.formatBytes(file.size)})`);
    this.convert();
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  csvToJson(): string {
    if (!this.inputText.trim()) {
      throw new Error('Please enter CSV data');
    }

    const lines = this.inputText.trim().split(/\r\n|\r|\n/);
    if (lines.length === 0) {
      throw new Error('Empty CSV data');
    }

    let headers: string[] = [];
    let dataStartIndex = 0;

    if (this.hasHeader) {
      headers = this.parseCsvLine(lines[0]);
      dataStartIndex = 1;
    } else {
      // Generate default headers: col1, col2, etc.
      const firstLine = this.parseCsvLine(lines[0]);
      headers = firstLine.map((_, index) => `col${index + 1}`);
      dataStartIndex = 0;
    }

    const result: any[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCsvLine(line);

      if (values.length !== headers.length) {
        console.warn(`Line ${i + 1} has ${values.length} columns, expected ${headers.length}`);
      }

      if (this.jsonFormat === 'objects') {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        result.push(obj);
      } else {
        result.push(values);
      }
    }

    return this.prettyPrint
      ? JSON.stringify(result, null, 2)
      : JSON.stringify(result);
  }

  jsonToCsv(): string {
    if (!this.inputText.trim()) {
      throw new Error('Please enter JSON data');
    }

    let data: any[];

    try {
      const parsed = JSON.parse(this.inputText);

      if (Array.isArray(parsed)) {
        data = parsed;
      } else if (typeof parsed === 'object') {
        data = [parsed];
      } else {
        throw new Error('JSON must be an array or object');
      }
    } catch (e) {
      throw new Error('Invalid JSON format');
    }

    if (data.length === 0) {
      throw new Error('Empty JSON array');
    }

    // Extract headers from first object
    const headers = Object.keys(data[0]);
    const rows: string[] = [];

    if (this.hasHeader) {
      rows.push(this.createCsvLine(headers));
    }

    // Convert each object to CSV row
    data.forEach(item => {
      const values = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
      rows.push(this.createCsvLine(values));
    });

    return rows.join('\n');
  }

  parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === this.delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  createCsvLine(values: string[]): string {
    return values.map(value => {
      // Escape if contains delimiter, quotes, or newlines
      if (value.includes(this.delimiter) || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(this.delimiter);
  }

  swapMode(): void {
    this.mode = this.mode === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json';
    // Swap input and output
    const temp = this.inputText;
    this.inputText = this.outputText;
    this.outputText = temp;
    this.errorMessage = '';
  }

  loadSampleCsv(): void {
    this.mode = 'csv-to-json';
    this.inputText = `name,age,city,salary
John Doe,30,New York,75000
Jane Smith,25,San Francisco,85000
Bob Johnson,35,Chicago,70000
Alice Williams,28,Boston,80000`;
    this.convert();
  }

  loadSampleJson(): void {
    this.mode = 'json-to-csv';
    this.inputText = JSON.stringify([
      { name: 'John Doe', age: 30, city: 'New York', salary: 75000 },
      { name: 'Jane Smith', age: 25, city: 'San Francisco', salary: 85000 },
      { name: 'Bob Johnson', age: 35, city: 'Chicago', salary: 70000 },
      { name: 'Alice Williams', age: 28, city: 'Boston', salary: 80000 }
    ], null, 2);
    this.convert();
  }

  copyOutput(): void {
    if (!this.outputText) return;
    this.utilityService.copyToClipboard(this.outputText, {
      label: this.mode === 'csv-to-json' ? 'JSON copied' : 'CSV copied'
    });
  }

  downloadOutput(): void {
    if (!this.outputText) return;
    const extension = this.mode === 'csv-to-json' ? 'json' : 'csv';
    const mimeType = this.mode === 'csv-to-json' ? 'application/json' : 'text/csv';
    this.utilityService.downloadFile(this.outputText, mimeType, `converted.${extension}`);
  }

  clearAll(): void {
    this.inputText = '';
    this.outputText = '';
    this.errorMessage = '';
    this.inputBytes = 0;
    this.outputBytes = 0;
    this.inputRowCount = 0;
    this.outputRowCount = 0;
    this.previewHeaders = [];
    this.previewRows = [];
  }
}
