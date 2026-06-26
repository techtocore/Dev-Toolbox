import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

type ContentType = 'text' | 'url' | 'wifi';
type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';
type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

@Component({
  selector: 'app-qr-code',
  standalone: false,
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.scss',
})
export class QrCode implements AfterViewInit, OnDestroy {
  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;

  /** Active content-type tab. */
  contentType: ContentType = 'text';

  // ---- Inputs per content type ----
  text = '';
  url = 'https://';

  // Wi-Fi fields.
  wifiSsid = '';
  wifiPassword = '';
  wifiEncryption: WifiEncryption = 'WPA';
  wifiHidden = false;

  // ---- Rendering options ----
  size = 256;
  errorCorrectionLevel: ErrorCorrection = 'M';
  margin = 4;
  foreground = '#000000';
  background = '#ffffff';

  isRendering = false;
  errorMessage = '';

  /** True once a QR has been drawn to the canvas (gates the download buttons). */
  hasRendered = false;

  private viewReady = false;
  /** Guards against overlapping async renders clobbering each other. */
  private renderToken = 0;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.render();
  }

  // ---- Content-type switching -------------------------------------------

  setContentType(type: ContentType): void {
    if (this.contentType === type) {
      return;
    }
    this.contentType = type;
    this.onInputChange();
  }

  /** Re-render whenever any input changes. Bound from the template. */
  onInputChange(): void {
    this.errorMessage = '';
    void this.render();
  }

  /** Clamp the size to a sensible, render-safe range. */
  onSizeChange(): void {
    if (!this.size || isNaN(this.size) || this.size < 64) {
      this.size = 64;
    } else if (this.size > 1024) {
      this.size = 1024;
    }
    this.onInputChange();
  }

  /** Clamp the quiet-zone margin (modules). */
  onMarginChange(): void {
    if (this.margin == null || isNaN(this.margin) || this.margin < 0) {
      this.margin = 0;
    } else if (this.margin > 20) {
      this.margin = 20;
    }
    this.onInputChange();
  }

  // ---- Payload building --------------------------------------------------

  /** The raw string that gets encoded into the QR for the active tab. */
  get payload(): string {
    switch (this.contentType) {
      case 'url':
        return this.url.trim();
      case 'wifi':
        return this.buildWifiPayload();
      case 'text':
      default:
        return this.text;
    }
  }

  get hasPayload(): boolean {
    return this.payload.trim().length > 0;
  }

  /**
   * Escapes the special characters \ ; , : and " for use inside a WIFI: URI
   * field, per the de-facto Wi-Fi QR format.
   */
  private escapeWifi(value: string): string {
    return value.replace(/([\\;,:"])/g, '\\$1');
  }

  private buildWifiPayload(): string {
    const ssid = this.wifiSsid.trim();
    if (!ssid) {
      return '';
    }
    const enc = this.wifiEncryption;
    const escapedSsid = this.escapeWifi(ssid);
    // Open networks carry no password segment.
    const passPart =
      enc === 'nopass' ? '' : `P:${this.escapeWifi(this.wifiPassword)};`;
    const hidden = this.wifiHidden ? 'true' : 'false';
    return `WIFI:T:${enc};S:${escapedSsid};${passPart}H:${hidden};;`;
  }

  // ---- Rendering ---------------------------------------------------------

  private async render(): Promise<void> {
    if (!this.viewReady) {
      return;
    }
    const canvas = this.qrCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const data = this.payload;
    const token = ++this.renderToken;

    if (!data.trim()) {
      // Empty payload: clear the canvas and show the empty state instead. Reset
      // isRendering too — a still-in-flight earlier render whose finally is
      // skipped by the token guard would otherwise leave the spinner stuck.
      this.clearCanvas(canvas);
      this.hasRendered = false;
      this.errorMessage = '';
      this.isRendering = false;
      return;
    }

    this.isRendering = true;
    try {
      const QRCode = (await import('qrcode')).default;
      // A newer render may have started while we awaited the import.
      if (token !== this.renderToken) {
        return;
      }
      await QRCode.toCanvas(canvas, data, {
        width: this.size,
        margin: this.margin,
        errorCorrectionLevel: this.errorCorrectionLevel,
        color: { dark: this.foreground, light: this.background },
      });
      if (token !== this.renderToken) {
        return;
      }
      this.hasRendered = true;
      this.errorMessage = '';
    } catch (err: unknown) {
      if (token !== this.renderToken) {
        return;
      }
      this.clearCanvas(canvas);
      this.hasRendered = false;
      this.errorMessage = this.describeError(err);
    } finally {
      if (token === this.renderToken) {
        this.isRendering = false;
      }
    }
  }

  private describeError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err ?? '');
    if (/too big|data too long|code length overflow/i.test(message)) {
      return 'Content is too large for the selected error-correction level. Try a lower level (L) or shorter content.';
    }
    return message || 'Could not generate the QR code. Please check your input.';
  }

  private clearCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ---- Downloads ---------------------------------------------------------

  downloadPng(): void {
    const canvas = this.qrCanvas?.nativeElement;
    if (!canvas || !this.hasRendered) {
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        this.errorMessage = 'This browser could not export the QR as PNG.';
        return;
      }
      this.utilityService.downloadBlob(blob, 'qr.png');
      this.toastService.success('Downloaded qr.png');
    }, 'image/png');
  }

  async downloadSvg(): Promise<void> {
    const data = this.payload;
    if (!data.trim() || !this.hasRendered) {
      return;
    }
    try {
      const QRCode = (await import('qrcode')).default;
      const svg = await QRCode.toString(data, {
        type: 'svg',
        margin: this.margin,
        errorCorrectionLevel: this.errorCorrectionLevel,
        color: { dark: this.foreground, light: this.background },
      });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      this.utilityService.downloadBlob(blob, 'qr.svg');
      this.toastService.success('Downloaded qr.svg');
    } catch (err: unknown) {
      this.errorMessage = this.describeError(err);
    }
  }

  copyPayload(): void {
    if (!this.hasPayload) {
      return;
    }
    void this.utilityService.copyToClipboard(this.payload, {
      label: 'Payload copied',
    });
  }

  ngOnDestroy(): void {
    // Invalidate any in-flight render so a late import resolution is ignored.
    this.renderToken++;
  }
}
