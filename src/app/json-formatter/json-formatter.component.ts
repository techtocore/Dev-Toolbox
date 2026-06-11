import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

type Mode = 'format' | 'minify' | 'sort';

@Component({
  selector: 'app-json-formatter',
  templateUrl: './json-formatter.component.html',
  styleUrls: ['./json-formatter.component.scss'],
  standalone: false
})
export class JsonFormatterComponent implements OnInit {
  input: string = '';
  output: string = '';
  errorMessage: string = '';
  isMobile = false;

  indentSize: number | 'tab' = 2;
  mode: Mode = 'format';

  // Stats
  inputBytes = 0;
  outputBytes = 0;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  process(): void {
    this.errorMessage = '';
    this.output = '';
    this.inputBytes = new Blob([this.input]).size;

    if (!this.input.trim()) {
      this.errorMessage = 'Input is empty. Paste a JSON document or click Load Sample.';
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(this.input);
    } catch (e: any) {
      this.errorMessage = this.diagnoseParseError(e?.message || 'Invalid JSON');
      return;
    }

    const indent = this.mode === 'minify' ? 0 : (this.indentSize === 'tab' ? '\t' : this.indentSize);
    const data = this.mode === 'sort' ? this.sortKeysDeep(parsed) : parsed;
    this.output = JSON.stringify(data, null, indent);
    this.outputBytes = new Blob([this.output]).size;
  }

  private diagnoseParseError(raw: string): string {
    if (/Unexpected token/i.test(raw)) {
      return `Parse error: ${raw}. Common causes: trailing commas, unquoted keys, or single quotes.`;
    }
    if (/Unexpected end/i.test(raw)) {
      return `Parse error: ${raw}. The document looks truncated — check for an unclosed bracket or quote.`;
    }
    return `Parse error: ${raw}`;
  }

  private sortKeysDeep(value: any): any {
    if (Array.isArray(value)) {
      return value.map(v => this.sortKeysDeep(v));
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, k) => {
          acc[k] = this.sortKeysDeep(value[k]);
          return acc;
        }, {} as Record<string, any>);
    }
    return value;
  }

  setMode(m: Mode): void {
    this.mode = m;
    if (this.input.trim()) this.process();
  }

  loadSample(): void {
    this.input = JSON.stringify({
      name: 'Dev Toolbox',
      version: '2.0.0',
      author: { name: 'Akash Ravi', url: 'https://akashravi.github.io/' },
      tags: ['developer', 'utility', 'browser'],
      stats: { tools: 22, openSource: true, ads: false },
      releases: [
        { version: '1.0.0', date: '2024-08-12', notes: 'Initial release' },
        { version: '2.0.0', date: '2026-01-15', notes: 'AI tools + redesign' }
      ]
    });
    this.process();
  }

  swapInputOutput(): void {
    if (!this.output) return;
    this.input = this.output;
    this.process();
  }

  clear(): void {
    this.input = '';
    this.output = '';
    this.errorMessage = '';
    this.inputBytes = 0;
    this.outputBytes = 0;
  }

  copyOutput(): void {
    if (!this.output) return;
    this.utilityService.copyToClipboard(this.output, { label: 'Formatted JSON copied' });
  }

  downloadOutput(): void {
    if (!this.output) {
      this.toastService.warning('Nothing to download — process some JSON first.');
      return;
    }
    const filename = this.mode === 'minify' ? 'data.min.json' : 'data.json';
    this.utilityService.downloadFile(this.output, 'application/json', filename);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  get savings(): number {
    if (this.inputBytes === 0 || this.outputBytes === 0) return 0;
    return Math.round(((this.inputBytes - this.outputBytes) / this.inputBytes) * 100);
  }
}
