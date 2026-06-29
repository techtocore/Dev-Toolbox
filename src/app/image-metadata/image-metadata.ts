import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

interface MetaRow {
  label: string;
  value: string;
}

interface MetaGroup {
  title: string;
  icon: string;
  rows: MetaRow[];
}

@Component({
  selector: 'app-image-metadata',
  standalone: false,
  templateUrl: './image-metadata.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-metadata.scss'
})
export class ImageMetadata implements OnDestroy {
  /** Caps the upload at 30 MB so we don't choke decoding a large image in-browser. */
  private static readonly MAX_BYTES = 30 * 1024 * 1024;
  // TIFF is intentionally excluded: exifr can parse its EXIF, but browsers can't
  // decode TIFF in <img>/canvas, so the preview and the canvas re-encode strip
  // would both fail. Only offer formats the browser can actually render.
  private static readonly ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

  fileName = '';
  fileSizeLabel = '';
  previewUrl = '';

  groups: MetaGroup[] = [];
  hasGps = false;
  gpsLat: number | null = null;
  gpsLon: number | null = null;
  noMetadata = false;

  exportFormat: 'jpeg' | 'png' = 'jpeg';

  loading = false;
  stripping = false;
  errorMessage = '';

  private selectedFile: File | null = null;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnDestroy(): void {
    this.revokePreview();
  }

  // ---- file intake -------------------------------------------------------

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
    this.resetResults();

    if (!ImageMetadata.ACCEPTED.includes(file.type)) {
      this.errorMessage = `Unsupported file type "${file.type || 'unknown'}". Choose a JPEG, PNG, or WebP image.`;
      return;
    }
    if (file.size > ImageMetadata.MAX_BYTES) {
      this.errorMessage = `That image is ${this.formatBytes(file.size)} — the limit is 30 MB.`;
      return;
    }
    if (file.size === 0) {
      this.errorMessage = 'That file is empty.';
      return;
    }

    this.selectedFile = file;
    // Default the export format to the source so transparency-bearing inputs
    // (PNG/WebP) default to a lossless, alpha-preserving format instead of JPEG.
    this.exportFormat = file.type === 'image/jpeg' ? 'jpeg' : 'png';
    this.fileName = file.name;
    this.fileSizeLabel = this.formatBytes(file.size);

    this.revokePreview();
    this.previewUrl = URL.createObjectURL(file);

    void this.parseMetadata(file);
  }

  // ---- EXIF parsing ------------------------------------------------------

  private async parseMetadata(file: File): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const exifr = (await import('exifr')).default;
      const tags = await exifr.parse(file, { gps: true, translateValues: true });

      if (!tags || Object.keys(tags).length === 0) {
        this.noMetadata = true;
        return;
      }

      this.buildGroups(tags);
      this.buildGps(tags);

      if (this.groups.length === 0 && !this.hasGps) {
        this.noMetadata = true;
      }
    } catch (err) {
      this.errorMessage =
        'Could not read metadata from this image. ' +
        (err instanceof Error ? err.message : 'The file may be corrupt or unsupported.');
    } finally {
      this.loading = false;
    }
  }

  private buildGroups(tags: Record<string, unknown>): void {
    const camera = this.collect(tags, [
      ['Make', 'Make'],
      ['Model', 'Model'],
      ['LensModel', 'Lens']
    ]);
    const capture = this.collect(tags, [
      ['DateTimeOriginal', 'Date taken'],
      ['ExposureTime', 'Exposure'],
      ['FNumber', 'Aperture (f)'],
      ['ISO', 'ISO'],
      ['FocalLength', 'Focal length']
    ]);
    const image = this.collect(tags, [
      ['ExifImageWidth', 'Width'],
      ['ExifImageHeight', 'Height'],
      ['ImageWidth', 'Width'],
      ['ImageHeight', 'Height'],
      ['Orientation', 'Orientation'],
      ['Software', 'Software']
    ]);

    this.groups = [];
    if (camera.length) this.groups.push({ title: 'Camera', icon: 'bi-camera', rows: camera });
    if (capture.length) this.groups.push({ title: 'Capture', icon: 'bi-aperture', rows: capture });
    if (image.length) this.groups.push({ title: 'Image', icon: 'bi-image', rows: this.dedupeRows(image) });
  }

  /** Pull a known set of keys (in order) into display rows, skipping empties. */
  private collect(tags: Record<string, unknown>, keys: [string, string][]): MetaRow[] {
    const rows: MetaRow[] = [];
    for (const [key, label] of keys) {
      if (key in tags) {
        const value = this.formatValue(tags[key]);
        if (value !== '') {
          rows.push({ label, value });
        }
      }
    }
    return rows;
  }

  /** Width/Height can appear under two key pairs — keep the first label only. */
  private dedupeRows(rows: MetaRow[]): MetaRow[] {
    const seen = new Set<string>();
    return rows.filter(r => {
      if (seen.has(r.label)) return false;
      seen.add(r.label);
      return true;
    });
  }

  private buildGps(tags: Record<string, unknown>): void {
    const lat = tags['latitude'];
    const lon = tags['longitude'];
    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      this.hasGps = true;
      this.gpsLat = lat;
      this.gpsLon = lon;
    }
  }

  get gpsLabel(): string {
    if (this.gpsLat === null || this.gpsLon === null) return '';
    return `${this.gpsLat.toFixed(6)}, ${this.gpsLon.toFixed(6)}`;
  }

  get mapUrl(): string {
    if (this.gpsLat === null || this.gpsLon === null) return '';
    const lat = this.gpsLat;
    const lon = this.gpsLon;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleString();
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
    }
    return String(value).trim();
  }

  copyAll(): void {
    const lines: string[] = [];
    for (const group of this.groups) {
      lines.push(group.title);
      for (const row of group.rows) {
        lines.push(`  ${row.label}: ${row.value}`);
      }
    }
    if (this.hasGps) {
      lines.push('GPS');
      lines.push(`  Coordinates: ${this.gpsLabel}`);
    }
    this.utilityService.copyToClipboard(lines.join('\n'), { label: 'Metadata copied' });
  }

  // ---- stripping ---------------------------------------------------------

  async downloadStripped(): Promise<void> {
    if (!this.selectedFile || !this.previewUrl) return;
    this.stripping = true;
    this.errorMessage = '';
    try {
      const blob = await this.reencode(this.previewUrl, this.exportFormat);
      if (!blob) {
        throw new Error('The browser could not re-encode this image.');
      }
      const ext = this.exportFormat === 'png' ? 'png' : 'jpg';
      const base = this.baseName(this.fileName);
      this.utilityService.downloadBlob(blob, `${base}-stripped.${ext}`);
      this.toastService.success('Stripped copy downloaded');
    } catch (err) {
      this.errorMessage =
        'Could not create a stripped copy. ' +
        (err instanceof Error ? err.message : 'The image may be too large or unsupported.');
    } finally {
      this.stripping = false;
    }
  }

  /**
   * Re-encode through a canvas. Drawing the decoded pixels into a fresh canvas
   * and exporting via toBlob discards every embedded EXIF/XMP/GPS tag.
   */
  private reencode(url: string, format: 'jpeg' | 'png'): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable.'));
            return;
          }
          // JPEG has no alpha channel; without a backdrop, transparent pixels
          // composite against transparent-black and turn black. Paint white first.
          if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);
          const mime = format === 'png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            blob => resolve(blob),
            mime,
            format === 'jpeg' ? 0.92 : undefined
          );
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Re-encode failed.'));
        }
      };
      img.onerror = () => reject(new Error('The image could not be decoded.'));
      img.src = url;
    });
  }

  // ---- helpers -----------------------------------------------------------

  clear(): void {
    this.revokePreview();
    this.selectedFile = null;
    this.fileName = '';
    this.fileSizeLabel = '';
    this.resetResults();
  }

  private resetResults(): void {
    this.groups = [];
    this.hasGps = false;
    this.gpsLat = null;
    this.gpsLon = null;
    this.noMetadata = false;
    this.errorMessage = '';
  }

  private revokePreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = '';
    }
  }

  private baseName(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name || 'image';
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
