import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

type PageSize = 'fit' | 'a4' | 'letter';
type Orientation = 'portrait' | 'landscape';

interface ImageItem {
  file: File;
  name: string;
  url: string;
}

const MAX_FILE_BYTES = 40 * 1024 * 1024; // 40 MB per image

// 'Fit to image' maps source pixels to PDF points. Treating images as 96 DPI
// (the CSS reference density) keeps pages at a sane physical size instead of
// 1px -> 1pt, which would yield multi-foot pages. The image is still drawn at
// full resolution; only the page's physical dimensions change.
const PX_TO_PT = 72 / 96;

@Component({
  selector: 'app-images-to-pdf',
  standalone: false,
  templateUrl: './images-to-pdf.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './images-to-pdf.scss',
})
export class ImagesToPdf implements OnDestroy {
  images: ImageItem[] = [];
  pageSize: PageSize = 'fit';
  orientation: Orientation = 'portrait';
  margin = 0;

  isBuilding = false;
  errorMessage = '';

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService,
  ) {}

  ngOnDestroy(): void {
    this.images.forEach(img => URL.revokeObjectURL(img.url));
    this.images = [];
  }

  // ---- file intake -------------------------------------------------------
  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const fs = e.dataTransfer?.files;
    if (fs?.length) this.handleFiles(fs);
  }

  onPick(e: Event): void {
    const i = e.target as HTMLInputElement;
    if (i.files?.length) this.handleFiles(i.files);
    i.value = '';
  }

  private handleFiles(files: FileList): void {
    this.errorMessage = '';
    const rejected: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name} (not an image)`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} (over 40 MB)`);
        continue;
      }
      this.images.push({
        file,
        name: file.name,
        url: URL.createObjectURL(file),
      });
    }

    if (rejected.length) {
      this.errorMessage = `Skipped ${rejected.length} file(s): ${rejected.join(', ')}`;
    }
  }

  // ---- list management ---------------------------------------------------
  removeImage(index: number): void {
    const [removed] = this.images.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    this.errorMessage = '';
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    [this.images[index - 1], this.images[index]] = [this.images[index], this.images[index - 1]];
  }

  moveDown(index: number): void {
    if (index >= this.images.length - 1) return;
    [this.images[index + 1], this.images[index]] = [this.images[index], this.images[index + 1]];
  }

  clearAll(): void {
    this.images.forEach(img => URL.revokeObjectURL(img.url));
    this.images = [];
    this.errorMessage = '';
  }

  // ---- build -------------------------------------------------------------
  async buildPdf(): Promise<void> {
    this.errorMessage = '';

    if (this.images.length === 0) {
      this.errorMessage = 'Add at least one image before building a PDF.';
      return;
    }

    this.isBuilding = true;
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();

      const margin = Math.max(0, Number(this.margin) || 0);

      // For fixed page sizes the dimensions are constant; validate the margin
      // (applied in PDF points) so a too-large value can't silently collapse the
      // image area to a near-blank page.
      let fixedPage: [number, number] | null = null;
      if (this.pageSize !== 'fit') {
        const b = this.pageSize === 'a4' ? [595.28, 841.89] : [612, 792];
        fixedPage = this.orientation === 'landscape' ? [b[1], b[0]] : [b[0], b[1]];
        const maxMargin = Math.min(fixedPage[0], fixedPage[1]) / 2 - 1;
        if (margin > maxMargin) {
          throw new Error(
            `Margin ${margin}pt is too large for the selected page size (max ${Math.floor(maxMargin)}pt).`
          );
        }
      }

      // Collect per-image failures so one bad image doesn't abandon the whole job.
      const failed: string[] = [];
      for (const item of this.images) {
        try {
          const bytes = new Uint8Array(await item.file.arrayBuffer());

          let embedded: Awaited<ReturnType<typeof pdf.embedPng>>;
          try {
            if (item.file.type === 'image/png') {
              embedded = await pdf.embedPng(bytes);
            } else {
              // JPEGs (and everything else) go through the browser canvas. Drawing
              // an <img> to a 2D canvas applies EXIF orientation (CSS
              // image-orientation defaults to from-image) and decodes CMYK to RGBA,
              // so toDataURL('image/png') yields an upright DeviceRGB PNG.
              // embedJpg, by contrast, ignores EXIF orientation and reproduces CMYK
              // via the DeviceCMYK path, producing sideways or mis-coloured pages.
              embedded = await pdf.embedPng(await this.toPngDataUrl(item.url));
            }
          } catch {
            // Some valid-but-unusual encodings (e.g. interlaced PNG) can still trip
            // up pdf-lib's parser. Fall back to a browser canvas rasterisation,
            // which decodes far more of them.
            embedded = await pdf.embedPng(await this.toPngDataUrl(item.url));
          }

          const imgW = embedded.width;
          const imgH = embedded.height;

          if (this.pageSize === 'fit') {
            // Scale source pixels to points at 96 DPI so the page gets a sane
            // physical size; the image still fills it at full resolution.
            const w = imgW * PX_TO_PT;
            const h = imgH * PX_TO_PT;
            const page = pdf.addPage([w, h]);
            page.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
          } else {
            const [pageW, pageH] = fixedPage!;
            const page = pdf.addPage([pageW, pageH]);

            const availW = Math.max(1, pageW - margin * 2);
            const availH = Math.max(1, pageH - margin * 2);
            const scale = Math.min(availW / imgW, availH / imgH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            const x = (pageW - drawW) / 2;
            const y = (pageH - drawH) / 2;

            page.drawImage(embedded, { x, y, width: drawW, height: drawH });
          }
        } catch {
          failed.push(item.file.name);
        }
      }

      if (pdf.getPageCount() === 0) {
        this.errorMessage = `Could not add any images${failed.length ? ': ' + failed.join(', ') : ''}.`;
        return;
      }

      const out = await pdf.save();
      const blob = new Blob([out as BlobPart], { type: 'application/pdf' });
      this.utilityService.downloadBlob(blob, 'images.pdf');
      const added = this.images.length - failed.length;
      this.toastService.success(`PDF built from ${added} image(s)`);
      if (failed.length) {
        this.errorMessage = `Skipped ${failed.length} unsupported/corrupt image(s): ${failed.join(', ')}`;
      }
    } catch (err: any) {
      this.errorMessage = err?.message
        ? `Could not build PDF: ${err.message}`
        : 'Could not build PDF.';
    } finally {
      this.isBuilding = false;
    }
  }

  private toPngDataUrl(objectUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported.'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.src = objectUrl;
    });
  }
}
