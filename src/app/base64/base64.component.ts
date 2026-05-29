import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

type Variant = 'standard' | 'urlsafe';
type Mode = 'text' | 'file';

@Component({
  selector: 'app-base64',
  templateUrl: './base64.component.html',
  styleUrls: ['./base64.component.scss'],
  standalone: false
})
export class Base64Component implements OnInit {
  decoded = '';
  encoded = '';

  variant: Variant = 'standard';
  mode: Mode = 'text';

  fileName = '';
  fileMime = '';
  fileSize = 0;
  isMobile = false;

  errorMessage = '';

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  setVariant(v: Variant): void {
    this.variant = v;
    if (this.mode === 'text' && this.decoded) this.encode();
  }

  setMode(m: Mode): void {
    this.mode = m;
    this.clear();
  }

  encode(): void {
    this.errorMessage = '';
    if (!this.decoded) {
      this.encoded = '';
      return;
    }
    try {
      const utf8 = unescape(encodeURIComponent(this.decoded));
      const std = btoa(utf8);
      this.encoded = this.variant === 'urlsafe' ? this.toUrlSafe(std) : std;
    } catch (e: any) {
      this.errorMessage = `Could not encode: ${e?.message || 'unknown error'}`;
      this.encoded = '';
    }
  }

  decode(): void {
    this.errorMessage = '';
    if (!this.encoded) {
      this.decoded = '';
      return;
    }
    try {
      const normalized = this.fromUrlSafe(this.encoded.trim());
      const padded = this.padBase64(normalized);
      const raw = atob(padded);
      // Convert raw byte string back through UTF-8 decoding.
      this.decoded = decodeURIComponent(
        Array.prototype.map.call(raw, (c: string) =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );
    } catch (e: any) {
      this.errorMessage = 'Invalid Base64 input — check for stray spaces, missing padding, or non-base64 characters.';
      this.decoded = '';
    }
  }

  private toUrlSafe(s: string): string {
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private fromUrlSafe(s: string): string {
    return s.replace(/-/g, '+').replace(/_/g, '/');
  }

  private padBase64(s: string): string {
    const mod = s.length % 4;
    return mod ? s + '='.repeat(4 - mod) : s;
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.encodeFile(file);
    input.value = '';
  }

  async onFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await this.encodeFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async encodeFile(file: File): Promise<void> {
    this.errorMessage = '';
    this.fileName = file.name;
    this.fileMime = file.type || 'application/octet-stream';
    this.fileSize = file.size;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as any);
      }
      const std = btoa(binary);
      this.encoded = this.variant === 'urlsafe' ? this.toUrlSafe(std) : std;
      this.toastService.success(`Encoded ${file.name} (${this.formatBytes(file.size)})`);
    } catch (e: any) {
      this.errorMessage = `Could not encode file: ${e?.message || 'unknown error'}`;
      this.encoded = '';
    }
  }

  asDataUrl(): string {
    if (!this.encoded || !this.fileMime) return '';
    const std = this.variant === 'urlsafe' ? this.padBase64(this.fromUrlSafe(this.encoded)) : this.encoded;
    return `data:${this.fileMime};base64,${std}`;
  }

  copyDataUrl(): void {
    const url = this.asDataUrl();
    if (!url) return;
    this.utilityService.copyToClipboard(url, { label: 'Data URL copied' });
  }

  loadSample(): void {
    this.mode = 'text';
    this.decoded = 'Hello, Dev Toolbox! 👋 — base64 round-trip with Unicode.';
    this.encode();
  }

  loadSampleEncoded(): void {
    this.mode = 'text';
    this.encoded = 'SGVsbG8sIERldiBUb29sYm94IQ==';
    this.decode();
  }

  swap(): void {
    if (!this.decoded && !this.encoded) return;
    const tmp = this.decoded;
    this.decoded = this.encoded;
    this.encoded = tmp;
    // Re-encode so both panes reflect each other after the swap, rather than
    // leaving the (now-stale) opposite pane untouched.
    if (this.decoded) {
      this.encode();
    } else if (this.encoded) {
      this.decode();
    }
  }

  clear(): void {
    this.decoded = '';
    this.encoded = '';
    this.fileName = '';
    this.fileMime = '';
    this.fileSize = 0;
    this.errorMessage = '';
  }

  copyEncoded(): void {
    if (!this.encoded) return;
    this.utilityService.copyToClipboard(this.encoded, { label: 'Base64 copied' });
  }

  copyDecoded(): void {
    if (!this.decoded) return;
    this.utilityService.copyToClipboard(this.decoded, { label: 'Decoded text copied' });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
