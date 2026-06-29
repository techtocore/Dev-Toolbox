import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';
import * as CryptoJS from 'crypto-js';

type Mode = 'text' | 'file';

interface HashRow {
  algo: 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';
  value: string;
}

@Component({
  selector: 'app-hash-generator',
  standalone: false,
  templateUrl: './hash-generator.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './hash-generator.scss',
})
export class HashGenerator implements OnInit {
  mode: Mode = 'text';

  inputText = '';
  useHmac = false;
  hmacKey = '';

  fileName = '';
  fileSize = 0;
  fileHashing = false;

  private hashSeq = 0;

  hashes: HashRow[] = [
    { algo: 'MD5', value: '' },
    { algo: 'SHA-1', value: '' },
    { algo: 'SHA-256', value: '' },
    { algo: 'SHA-512', value: '' }
  ];

  isMobile = false;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  setMode(m: Mode): void {
    this.hashSeq++;
    this.mode = m;
    this.clearHashes();
  }

  generateHashes(): void {
    if (this.mode !== 'text' || !this.inputText) {
      this.clearHashes();
      return;
    }

    if (this.useHmac) {
      const key = this.hmacKey;
      if (!key) {
        this.clearHashes();
        return;
      }
      this.hashes = [
        { algo: 'MD5',     value: CryptoJS.HmacMD5(this.inputText, key).toString() },
        { algo: 'SHA-1',   value: CryptoJS.HmacSHA1(this.inputText, key).toString() },
        { algo: 'SHA-256', value: CryptoJS.HmacSHA256(this.inputText, key).toString() },
        { algo: 'SHA-512', value: CryptoJS.HmacSHA512(this.inputText, key).toString() }
      ];
    } else {
      this.hashes = [
        { algo: 'MD5',     value: CryptoJS.MD5(this.inputText).toString() },
        { algo: 'SHA-1',   value: CryptoJS.SHA1(this.inputText).toString() },
        { algo: 'SHA-256', value: CryptoJS.SHA256(this.inputText).toString() },
        { algo: 'SHA-512', value: CryptoJS.SHA512(this.inputText).toString() }
      ];
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.hashFile(file);
    input.value = '';
  }

  async onFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await this.hashFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async hashFile(file: File): Promise<void> {
    const seq = ++this.hashSeq;
    this.fileName = file.name;
    this.fileSize = file.size;
    this.fileHashing = true;
    this.clearHashes();

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (seq !== this.hashSeq) return;
      const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(arrayBuffer) as any);
      this.hashes = [
        { algo: 'MD5',     value: CryptoJS.MD5(wordArray).toString() },
        { algo: 'SHA-1',   value: CryptoJS.SHA1(wordArray).toString() },
        { algo: 'SHA-256', value: CryptoJS.SHA256(wordArray).toString() },
        { algo: 'SHA-512', value: CryptoJS.SHA512(wordArray).toString() }
      ];
      if (seq === this.hashSeq) {
        this.toastService.success(`Hashed ${file.name} (${this.formatBytes(file.size)})`);
      }
    } catch (e: any) {
      if (seq === this.hashSeq) {
        this.toastService.error(`Failed to hash file: ${e?.message || 'unknown error'}`);
      }
    } finally {
      if (seq === this.hashSeq) {
        this.fileHashing = false;
      }
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  loadSample(): void {
    this.mode = 'text';
    this.useHmac = false;
    this.inputText = 'The quick brown fox jumps over the lazy dog';
    this.generateHashes();
  }

  clearHashes(): void {
    this.hashes = this.hashes.map(h => ({ ...h, value: '' }));
    if (this.mode === 'file') {
      this.fileName = '';
      this.fileSize = 0;
    }
  }

  clear(): void {
    this.inputText = '';
    this.hmacKey = '';
    this.clearHashes();
  }

  copy(value: string, algo: string): void {
    if (!value) return;
    this.utilityService.copyToClipboard(value, { label: `${algo} copied` });
  }
}
