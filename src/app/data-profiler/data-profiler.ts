import { Component, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./data-profiler.scss']
})
export class DataProfiler {
  private static readonly MAX_INPUT_BYTES = 10 * 1024 * 1024;
  private static readonly CSV_LIMITS = {
    maxRows: 100_000,
    maxColumns: 1_000,
    maxCellLength: 1_000_000
  };

  inputData: string = '';
  format: 'csv' | 'json' = 'csv';
  delimiter: string = ',';
  hasHeader: boolean = true;

  profiles: ColumnProfile[] = [];
  totalRows: number = 0;
  errorMessage: string = '';

  /** System prompt for the on-device "AI insights" feature. */
  readonly aiSystem =
    'You are a senior data analyst. You are given a JSON profile of a tabular dataset: the row ' +
    'count and, per column, its inferred type, null percentage, uniqueness, min/max, ' +
    'mean/median/mode, and most frequent values. Write a concise, plain-English briefing for a ' +
    'developer. Use short Markdown bullet points grouped under bold headings for: Overview (what ' +
    'the data likely represents), Data quality (high null %, low or near-unique cardinality, ' +
    'type inconsistencies, possible outliers), and Notable patterns. Be specific and reference ' +
    'real column names. Never invent columns or values that are not present in the profile.';

  constructor(
    private utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  /**
   * Compact, model-friendly serialization of the computed profile. Trims heavy
   * fields (e.g. long top-value lists) so the prompt stays small and focused.
   */
  get aiInput(): string {
    if (this.profiles.length === 0) {
      return '';
    }
    const summary = {
      totalRows: this.totalRows,
      totalColumns: this.profiles.length,
      columns: this.profiles.map(p => ({
        name: p.name,
        type: p.type,
        nullPercent: Math.round(p.nullPercent),
        uniqueCount: p.uniqueCount,
        uniquePercent: Math.round(p.uniquePercent),
        min: p.min,
        max: p.max,
        mean: p.mean != null ? Number(p.mean.toFixed(2)) : undefined,
        median: p.median != null ? Number(p.median.toFixed(2)) : undefined,
        mode: p.mode,
        topValues: p.topValues?.slice(0, 3).map(t => `${t.value} (×${t.count})`),
      })),
    };
    return JSON.stringify(summary);
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
    if (file.size > DataProfiler.MAX_INPUT_BYTES) {
      this.errorMessage = 'That file exceeds the 10 MB safety limit.';
      this.profiles = [];
      return;
    }
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
    const csv = [headers, ...rows]
      .map(row => this.utilityService.serializeCsvRow(row))
      .join('\n');
    this.utilityService.downloadFile(csv, 'text/csv', 'profile.csv');
  }

  analyzeData(): void {
    this.errorMessage = '';
    this.profiles = [];
    this.totalRows = 0;

    try {
      if (new Blob([this.inputData]).size > DataProfiler.MAX_INPUT_BYTES) {
        throw new Error('Input exceeds the 10 MB safety limit');
      }
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
    // Single-pass, quote-aware parse (handles newlines inside quoted fields).
    const rows = this.utilityService.parseCsv(
      this.inputData,
      this.delimiter,
      DataProfiler.CSV_LIMITS
    );
    if (rows.length === 0) return [];

    let headers: string[];
    let dataRows: string[][];

    if (this.hasHeader) {
      headers = rows[0];
      dataRows = rows.slice(1);
    } else {
      headers = rows[0].map((_, index) => `col${index + 1}`);
      dataRows = rows;
    }

    const data: any[] = [];

    for (const values of dataRows) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }

    return data;
  }

  parseJson(): any[] {
    const parsed = JSON.parse(this.inputData);

    const rows = Array.isArray(parsed) ? parsed : [parsed];
    if (rows.some(row => row === null || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error('JSON data must be an object or an array of objects');
    }
    return rows;
  }

  profileData(data: any[]): void {
    if (data.length === 0) return;

    // Union of keys across all rows so heterogeneous JSON (keys present only in
    // later rows) is not silently dropped. CSV rows are uniform, so this is a
    // no-op there.
    const columns = Array.from(
      new Set(data.flatMap(row => (row && typeof row === 'object' ? Object.keys(row) : [])))
    );

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

    // Normalize complex (object/array) cell values to a stable JSON string key so
    // equal objects/arrays collapse instead of being compared by reference.
    const normalizedValues = nonNullValues.map(v =>
      v && typeof v === 'object' ? JSON.stringify(v) : v
    );

    // Count unique values (recomputed on normalized values below for nested JSON).
    const uniqueValues = new Set(normalizedValues);
    profile.uniqueCount = uniqueValues.size;
    profile.uniquePercent = (profile.uniqueCount / normalizedValues.length) * 100;

    // Calculate statistics based on type
    if (profile.type === 'number') {
      // Only finite numbers contribute to numeric stats; mostly-numeric columns
      // may still contain non-numeric cells that would otherwise coerce to NaN
      // and poison mean/median.
      const numbers = nonNullValues.map(v => Number(v)).filter(n => Number.isFinite(n));
      if (numbers.length === 0) {
        // No usable numbers after filtering — fall back to non-numeric stats.
        profile.mode = this.calculateMode(normalizedValues);
      } else {
        // Single O(n) pass — Math.min/max(...spread) throws RangeError (call-stack
        // argument limit) on large columns. `numbers` is non-empty here.
        let min = numbers[0];
        let max = numbers[0];
        for (const n of numbers) {
          if (n < min) min = n;
          if (n > max) max = n;
        }
        profile.min = min;
        profile.max = max;
        profile.mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        profile.median = this.calculateMedian(numbers);
        profile.mode = this.calculateMode(numbers);
      }
    } else {
      // For non-numeric columns the unsorted first/last values aren't a
      // meaningful min/max, so leave them undefined (exports coalesce to blank).
      profile.mode = this.calculateMode(normalizedValues);
    }

    // Get top values
    profile.topValues = this.getTopValues(normalizedValues, 5);

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
    if (typeof value !== 'string') return false;
    // Require an ISO-ish (YYYY-MM-DD...) or common numeric (D/M/Y, M-D-Y, etc.)
    // shape before trusting new Date(), so free text like 'May 5' or '12 12'
    // isn't mislabeled as a date.
    if (
      !/^\d{4}-\d{1,2}-\d{1,2}([T ]|$)/.test(value) &&
      !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(value)
    ) {
      return false;
    }
    return !isNaN(new Date(value).getTime());
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
