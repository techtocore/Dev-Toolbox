import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import type { PDFDocument as PDFDocumentType } from 'pdf-lib';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

interface PageEntry {
  /** Index of this page in the original source document. */
  srcIndex: number;
  /** Extra rotation the user has applied, normalised to 0/90/180/270. */
  rotation: number;
  /** Whether the user has marked this page for deletion. */
  deleted: boolean;
}

@Component({
  selector: 'app-pdf-organize',
  standalone: false,
  templateUrl: './pdf-organize.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pdf-organize.scss'
})
export class PdfOrganize implements OnDestroy {
  /** Working list of pages in their current (possibly reordered) order. */
  pages: PageEntry[] = [];
  /** Name of the loaded file, used to label the UI and the download. */
  fileName: string = '';
  /** Parsed source document, reused so applying changes does not reparse the PDF. */
  private sourceDocument: PDFDocumentType | null = null;

  loading: boolean = false;
  errorMessage: string = '';

  /** Cap uploads at a sensible size to avoid locking up the browser. */
  private readonly maxBytes = 100 * 1024 * 1024; // 100 MB
  private loadSeq = 0;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnDestroy(): void {
    this.loadSeq++;
    this.sourceDocument = null;
  }

  // ---- Upload / dropzone --------------------------------------------------

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

  private async handleFiles(files: FileList): Promise<void> {
    const file = files[0];
    const seq = ++this.loadSeq;
    this.errorMessage = '';
    this.loading = false;
    this.reset();

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.errorMessage = 'Please choose a PDF file (.pdf).';
      return;
    }
    if (file.size === 0) {
      this.errorMessage = 'That file is empty.';
      return;
    }
    if (file.size > this.maxBytes) {
      this.errorMessage = 'That file is too large (max 100 MB).';
      return;
    }

    this.loading = true;
    try {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (seq !== this.loadSeq) {
        return;
      }
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      if (seq !== this.loadSeq) {
        return;
      }
      // pdf-lib can't decrypt — ignoreEncryption only suppresses the throw, so an
      // encrypted source would rebuild into a corrupt PDF. Refuse it up front.
      if (doc.isEncrypted) {
        this.errorMessage = 'This PDF is password-protected. Remove the password and try again.';
        return;
      }
      const count = doc.getPageCount();
      if (count === 0) {
        this.errorMessage = 'This PDF has no pages.';
        return;
      }

      this.sourceDocument = doc;
      this.fileName = file.name;
      this.pages = Array.from({ length: count }, (_, idx) => ({
        srcIndex: idx,
        rotation: 0,
        deleted: false
      }));
    } catch (err: unknown) {
      if (seq === this.loadSeq) {
        this.errorMessage =
          'Could not read that PDF. It may be corrupt or not a valid PDF. ' +
          (err instanceof Error ? err.message : '');
      }
    } finally {
      if (seq === this.loadSeq) {
        this.loading = false;
      }
    }
  }

  // ---- Per-page operations -----------------------------------------------

  rotateLeft(page: PageEntry): void {
    page.rotation = this.normalize(page.rotation - 90);
  }

  rotateRight(page: PageEntry): void {
    page.rotation = this.normalize(page.rotation + 90);
  }

  toggleDelete(page: PageEntry): void {
    page.deleted = !page.deleted;
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    [this.pages[index - 1], this.pages[index]] = [
      this.pages[index],
      this.pages[index - 1]
    ];
  }

  moveDown(index: number): void {
    if (index >= this.pages.length - 1) return;
    [this.pages[index + 1], this.pages[index]] = [
      this.pages[index],
      this.pages[index + 1]
    ];
  }

  rotateAll(delta: -90 | 90): void {
    this.pages
      .filter(page => !page.deleted)
      .forEach(page => page.rotation = this.normalize(page.rotation + delta));
  }

  reverseOrder(): void {
    this.pages.reverse();
  }

  restoreAll(): void {
    this.pages.forEach(page => page.deleted = false);
  }

  resetChanges(): void {
    this.pages = Array.from({ length: this.pages.length }, (_, srcIndex) => ({
      srcIndex,
      rotation: 0,
      deleted: false
    }));
  }

  private normalize(angle: number): number {
    return ((angle % 360) + 360) % 360;
  }

  // ---- View helpers (referenced by template) ------------------------------

  get hasDocument(): boolean {
    return this.pages.length > 0;
  }

  get remainingCount(): number {
    return this.pages.filter(p => !p.deleted).length;
  }

  get hasChanges(): boolean {
    return this.pages.some((page, index) =>
      page.srcIndex !== index || page.rotation !== 0 || page.deleted
    );
  }

  /** Download is only meaningful when at least one page survives. */
  get canDownload(): boolean {
    return this.hasDocument && this.remainingCount > 0 && !this.loading;
  }

  trackByEntry(_index: number, page: PageEntry): number {
    return page.srcIndex;
  }

  // ---- Apply & download ---------------------------------------------------

  async applyAndDownload(): Promise<void> {
    const src = this.sourceDocument;
    if (!src || !this.canDownload) return;

    this.loading = true;
    this.errorMessage = '';
    const seq = this.loadSeq;
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const out = await PDFDocument.create();

      const kept = this.pages.filter(p => !p.deleted);
      const copied = await out.copyPages(src, kept.map(p => p.srcIndex));
      copied.forEach((pg, i) => {
        const base = Math.round(src.getPage(kept[i].srcIndex).getRotation().angle / 90) * 90;
        pg.setRotation(degrees(this.normalize(base + kept[i].rotation)));
        out.addPage(pg);
      });

      const bytes = await out.save();
      if (seq !== this.loadSeq) {
        return;
      }
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const sourceName = this.fileName.replace(/\.pdf$/i, '');
      const downloadName = this.utilityService.normalizeDownloadName(
        `${sourceName}-organized`,
        'pdf',
        'organized'
      );
      this.utilityService.downloadBlob(blob, downloadName);
      this.toastService.success('Organized PDF downloaded');
    } catch (err: unknown) {
      if (seq === this.loadSeq) {
        this.errorMessage =
          'Failed to build the PDF. ' +
          (err instanceof Error ? err.message : 'Unknown error.');
      }
    } finally {
      if (seq === this.loadSeq) {
        this.loading = false;
      }
    }
  }

  // ---- Reset --------------------------------------------------------------

  clear(): void {
    this.loadSeq++;
    this.loading = false;
    this.reset();
    this.errorMessage = '';
  }

  private reset(): void {
    this.pages = [];
    this.fileName = '';
    this.sourceDocument = null;
  }
}
