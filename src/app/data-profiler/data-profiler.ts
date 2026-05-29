import { Component } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

interface ColumnProfile {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'mixed';
  count: number;
  nullCount: number;
  uniqueCount: number;
  nullPercent: number;
  uniquePercent: number;
  min?: any;
  max?: any;
  mean?: number;
  median?: number;
  mode?: any;
  topValues?: { value: any; count: number }[];
}

@Component({
  selector: 'app-data-profiler',
  standalone: false,
  templateUrl: './data-profiler.html',
  styleUrls: ['./data-profiler.scss']
})
export class DataProfiler {
  inputData: string = '';
  format: 'csv' | 'json' = 'csv';
  delimiter: string = ',';
  hasHeader: boolean = true;

  profiles: ColumnProfile[] = [];
  totalRows: number = 0;
  errorMessage: string = '';

  constructor(
    private utilityService: UtilityService,
    private toastService: ToastService
  ) {}

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
    if (name.endsWith('.json')) {
      this.format = 'json';
    } else if (name.endsWith('.tsv')) {
      this.format = 'csv';
      this.delimiter = '\t';
    } else {
      this.format = 'csv';
      this.delimiter = ',';
    }
    this.inputData = await file.text();
    this.toastService.info(`Loaded ${file.name}`);
    this.analyzeData();
  }

  exportJson(): void {
    if (this.profiles.length === 0) return;
    const payload = {
      summary: {
        totalRows: this.totalRows,
        totalColumns: this.profiles.length,
        generatedAt: new Date().toISOString()
      },
      profiles: this.profiles
    };
    this.utilityService.downloadFile(
      JSON.stringify(payload, null, 2),
      'application/json',
      'profile.json'
    );
  }

  exportCsv(): void {
    if (this.profiles.length === 0) return;
    const headers = ['column', 'type', 'count', 'null_count', 'null_percent', 'unique_count', 'unique_percent', 'min', 'max', 'mean', 'median', 'mode'];
    const rows = this.profiles.map(p => [
      p.name,
      p.type,
      p.count,
      p.nullCount,
      p.nullPercent.toFixed(2),
      p.uniqueCount,
      p.uniquePercent.toFixed(2),
      p.min ?? '',
      p.max ?? '',
      p.mean?.toFixed(4) ?? '',
      p.median?.toFixed(4) ?? '',
      p.mode ?? ''
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(v => {
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\n');
    this.utilityService.downloadFile(csv, 'text/csv', 'profile.csv');
  }

  analyzeData(): void {
    this.errorMessage = '';
    this.profiles = [];
    this.totalRows = 0;

    try {
      let data: any[] = [];

      if (this.format === 'csv') {
        data = this.parseCsv();
      } else {
        data = this.parseJson();
      }

      if (data.length === 0) {
        throw new Error('No data to analyze');
      }

      this.totalRows = data.length;
      this.profileData(data);

    } catch (error: any) {
      this.errorMessage = error.message || 'Analysis failed';
    }
  }

  parseCsv(): any[] {
    const lines = this.inputData.trim().split(/\r\n|\r|\n/);
    if (lines.length === 0) return [];

    let headers: string[] = [];
    let dataStartIndex = 0;

    if (this.hasHeader) {
      headers = this.parseCsvLine(lines[0]);
      dataStartIndex = 1;
    } else {
      const firstLine = this.parseCsvLine(lines[0]);
      headers = firstLine.map((_, index) => `col${index + 1}`);
      dataStartIndex = 0;
    }

    const data: any[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCsvLine(line);
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });

      data.push(row);
    }

    return data;
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
          i++;
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

  parseJson(): any[] {
    const parsed = JSON.parse(this.inputData);

    if (Array.isArray(parsed)) {
      return parsed;
    } else if (typeof parsed === 'object') {
      return [parsed];
    }

    throw new Error('JSON must be an array or object');
  }

  profileData(data: any[]): void {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);

    columns.forEach(columnName => {
      const values = data.map(row => row[columnName]);
      this.profiles.push(this.profileColumn(columnName, values));
    });
  }

  profileColumn(name: string, values: any[]): ColumnProfile {
    const profile: ColumnProfile = {
      name,
      type: 'mixed',
      count: values.length,
      nullCount: 0,
      uniqueCount: 0,
      nullPercent: 0,
      uniquePercent: 0
    };

    // Count nulls
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    profile.nullCount = values.length - nonNullValues.length;
    profile.nullPercent = (profile.nullCount / values.length) * 100;

    if (nonNullValues.length === 0) {
      return profile;
    }

    // Detect type
    profile.type = this.detectType(nonNullValues);

    // Count unique values
    const uniqueValues = new Set(nonNullValues);
    profile.uniqueCount = uniqueValues.size;
    profile.uniquePercent = (profile.uniqueCount / nonNullValues.length) * 100;

    // Calculate statistics based on type
    if (profile.type === 'number') {
      const numbers = nonNullValues.map(v => Number(v));
      profile.min = Math.min(...numbers);
      profile.max = Math.max(...numbers);
      profile.mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
      profile.median = this.calculateMedian(numbers);
      profile.mode = this.calculateMode(numbers);
    } else {
      profile.min = nonNullValues[0];
      profile.max = nonNullValues[nonNullValues.length - 1];
      profile.mode = this.calculateMode(nonNullValues);
    }

    // Get top values
    profile.topValues = this.getTopValues(nonNullValues, 5);

    return profile;
  }

  detectType(values: any[]): 'string' | 'number' | 'date' | 'boolean' | 'mixed' {
    const types = new Set<string>();

    values.forEach(value => {
      if (typeof value === 'boolean' || value === 'true' || value === 'false') {
        types.add('boolean');
      } else if (!isNaN(Number(value)) && value !== '') {
        types.add('number');
      } else if (this.isDate(value)) {
        types.add('date');
      } else {
        types.add('string');
      }
    });

    if (types.size === 1) {
      return Array.from(types)[0] as any;
    }

    // Check if majority are numbers
    const numberCount = values.filter(v => !isNaN(Number(v)) && v !== '').length;
    if (numberCount / values.length > 0.8) {
      return 'number';
    }

    return 'mixed';
  }

  isDate(value: any): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  calculateMode(values: any[]): any {
    const frequency: Map<any, number> = new Map();

    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });

    let maxFreq = 0;
    let mode = values[0];

    frequency.forEach((freq, value) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = value;
      }
    });

    return mode;
  }

  getTopValues(values: any[], limit: number): { value: any; count: number }[] {
    const frequency: Map<any, number> = new Map();

    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  loadSampleData(): void {
    this.format = 'csv';
    this.inputData = `name,age,city,salary,department
John Doe,30,New York,75000,Engineering
Jane Smith,25,San Francisco,85000,Engineering
Bob Johnson,35,Chicago,70000,Sales
Alice Williams,28,Boston,80000,Marketing
Charlie Brown,32,Seattle,78000,Engineering
Diana Prince,29,Los Angeles,82000,Marketing
Eve Davis,31,Miami,76000,Sales
Frank Miller,27,Denver,73000,Engineering
Grace Lee,33,Austin,79000,Sales
Henry Taylor,26,Portland,72000,Marketing`;
    this.analyzeData();
  }

  clearAll(): void {
    this.inputData = '';
    this.profiles = [];
    this.totalRows = 0;
    this.errorMessage = '';
  }
}
