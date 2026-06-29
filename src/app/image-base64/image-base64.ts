import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-image-base64',
  standalone: false,
  templateUrl: './image-base64.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-base64.scss',
})
export class ImageBase64 implements OnDestroy {
  /** Cap the upload at 15 MB — a data URI inflates ~33% over the raw bytes. */
  private static readonly MAX_BYTES = 15 * 1024 * 1024;
  /** Warn once a data URI passes ~1 MB, where inlining starts to hurt. */
  private static readonly WARN_BYTES = 1024 * 1024;

  // ---- ENCODE (image -> data URI) ---------------------------------------
  fileName = '';
  fileMime = '';
  encodeUri = '';
  encodeBytes = 0;
  encodeError = '';

  // ---- DECODE (data URI -> image) ---------------------------------------
  decodeInput = '';
  /** Validated, displayable data URI for the live preview (or '' if invalid). */
  decodePreview = '';
  /**
   * The validated data URI kept for download/fetch. Unlike decodePreview it
   * survives an <img> render failure, so non-previewable formats stay downloadable.
   */
  decodeUri = '';
  /**
   * True once the pasted data URI parses as a valid image, independent of
   * whether the browser can render it as an <img>. Gates the Download button so
   * formats the browser can't preview (TIFF/ICO/AVIF) stay downloadable.
   */
  decodeValid = false;
  decodeMime = '';
  decodeError = '';
  /** Softer note shown when the data URI is valid but the browser won't preview it. */
  decodeNote = '';

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnDestroy(): void {
    // Nothing to revoke: previews are inline data URIs, not object URLs.
  }

  // ---- ENCODE: dropzone handlers ----------------------------------------

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
    this.resetEncode();

    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.encodeError = `Please choose an image file (got "${file.type || 'unknown type'}").`;
      return;
    }
    if (file.size === 0) {
      this.encodeError = 'That file is empty.';
      return;
    }
    if (file.size > ImageBase64.MAX_BYTES) {
      this.encodeError = `That image is ${this.formatBytes(file.size)} — the limit is 15 MB.`;
      return;
    }

    void this.encodeFile(file);
  }

  private encodeFile(file: File): Promise<void> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result.startsWith('data:')) {
          this.encodeError = 'Could not read that image as a data URI.';
          resolve();
          return;
        }
        this.encodeUri = result;
        this.encodeBytes = result.length;
        this.fileName = file.name;
        this.fileMime = file.type;
        this.toastService.success(`Encoded ${file.name}`);
        resolve();
      };
      reader.onerror = () => {
        this.encodeError = 'Could not read that image. It may be corrupt or unsupported.';
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  /** Data URIs above ~1 MB bloat HTML/CSS and slow page parsing. */
  get encodeTooLarge(): boolean {
    return this.encodeBytes > ImageBase64.WARN_BYTES;
  }

  get cssSnippet(): string {
    return this.encodeUri ? `background-image: url("${this.encodeUri}");` : '';
  }

  get htmlSnippet(): string {
    return this.encodeUri ? `<img src="${this.encodeUri}" alt="">` : '';
  }

  copyUri(): void {
    if (!this.encodeUri) {
      return;
    }
    this.utilityService.copyToClipboard(this.encodeUri, { label: 'Data URI copied' });
  }

  copyCss(): void {
    if (!this.encodeUri) {
      return;
    }
    this.utilityService.copyToClipboard(this.cssSnippet, { label: 'CSS snippet copied' });
  }

  copyHtml(): void {
    if (!this.encodeUri) {
      return;
    }
    this.utilityService.copyToClipboard(this.htmlSnippet, { label: 'HTML snippet copied' });
  }

  clearEncode(): void {
    this.resetEncode();
  }

  private resetEncode(): void {
    this.encodeUri = '';
    this.encodeBytes = 0;
    this.fileName = '';
    this.fileMime = '';
    this.encodeError = '';
  }

  // ---- DECODE: data URI -> image ----------------------------------------

  onDecodeInput(): void {
    this.decodeError = '';
    this.decodeNote = '';
    this.decodePreview = '';
    this.decodeUri = '';
    this.decodeValid = false;
    this.decodeMime = '';

    const raw = this.decodeInput.trim();
    if (!raw) {
      return;
    }

    const parsed = this.parseDataUri(raw);
    if (!parsed) {
      this.decodeError =
        'That does not look like a valid data URI. It should start with "data:image/...;base64," followed by base64 data.';
      return;
    }
    if (!parsed.mime.startsWith('image/')) {
      this.decodeError = `This data URI is "${parsed.mime}", not an image.`;
      return;
    }

    this.decodePreview = raw;
    this.decodeUri = raw;
    this.decodeValid = true;
    this.decodeMime = parsed.mime;
  }

  /** True when the active decode-side image is an SVG (can carry scripts). */
  get decodeIsSvg(): boolean {
    return this.decodeMime === 'image/svg+xml';
  }

  /** True when the active encode-side image is an SVG (can carry scripts). */
  get encodeIsSvg(): boolean {
    return this.fileMime === 'image/svg+xml';
  }

  /**
   * Validate a `data:` URI and pull out its MIME type. Returns null when the
   * shape is wrong or (for base64 payloads) the body fails to decode.
   */
  private parseDataUri(uri: string): { mime: string } | null {
    // Split on the first comma: everything before it is the metadata (mime +
    // params + an optional ;base64 token), everything after is the payload.
    const match = /^data:([^,]*),([\s\S]*)$/i.exec(uri);
    if (!match) {
      return null;
    }
    const meta = (match[1] || '').toLowerCase().split(';');
    const isBase64 = meta.includes('base64');
    const mime = meta[0] && meta[0] !== 'base64' ? meta[0] : 'text/plain';
    const data = match[2] ?? '';
    if (!data) {
      return null;
    }
    if (isBase64) {
      try {
        atob(data.replace(/\s+/g, ''));
      } catch {
        return null;
      }
    }
    return { mime };
  }

  /**
   * The browser couldn't render the data URI as an <img>. This happens both for
   * genuinely broken data and for valid-but-unrenderable formats (TIFF/ICO/AVIF
   * in some browsers), so we only drop the inline preview — the URI parsed, so
   * we keep it downloadable and show a soft note rather than a hard error.
   */
  onPreviewError(): void {
    this.decodePreview = '';
    this.decodeNote =
      'Preview unavailable in this browser, but the data URI is valid — you can still download the image.';
  }

  async downloadDecoded(): Promise<void> {
    if (!this.decodeValid) {
      return;
    }
    this.decodeError = '';
    try {
      const res = await fetch(this.decodeUri);
      const blob = await res.blob();
      const ext = this.extForMime(this.decodeMime || blob.type);
      this.utilityService.downloadBlob(blob, `image.${ext}`);
      this.toastService.success('Image downloaded');
    } catch (err) {
      this.decodeError =
        'Could not convert that data URI to an image. ' +
        (err instanceof Error ? err.message : 'The data may be malformed.');
    }
  }

  clearDecode(): void {
    this.decodeInput = '';
    this.decodePreview = '';
    this.decodeUri = '';
    this.decodeValid = false;
    this.decodeMime = '';
    this.decodeError = '';
    this.decodeNote = '';
  }

  private extForMime(mime: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
      'image/tiff': 'tiff',
      'image/avif': 'avif',
    };
    return map[mime.toLowerCase()] || 'img';
  }

  // ---- shared helper -----------------------------------------------------

  formatBytes(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
