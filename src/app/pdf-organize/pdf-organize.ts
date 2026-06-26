import { Component, OnDestroy } from '@angular/core';
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
  styleUrl: './pdf-organize.scss'
})
export class PdfOrganize implements OnDestroy {
  /** Working list of pages in their current (possibly reordered) order. */
  pages: PageEntry[] = [];
  /** Name of the loaded file, used to label the UI and the download. */
  fileName: string = '';
  /** Raw bytes of the loaded PDF, copied for safe lazy re-use on apply. */
  private sourceBytes: Uint8Array | null = null;

  loading: boolean = false;
  errorMessage: string = '';

  /** Cap uploads at a sensible size to avoid locking up the browser. */
  private readonly maxBytes = 100 * 1024 * 1024; // 100 MB

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnDestroy(): void {
    this.sourceBytes = null;
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
    this.errorMessage = '';

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
    this.reset();
    try {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
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

      this.sourceBytes = bytes;
      this.fileName = file.name;
      this.pages = Array.from({ length: count }, (_, idx) => ({
        srcIndex: idx,
        rotation: 0,
        deleted: false
      }));
    } catch (err: unknown) {
      this.errorMessage =
        'Could not read that PDF. It may be corrupt or not a valid PDF. ' +
        (err instanceof Error ? err.message : '');
    } finally {
      this.loading = false;
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

  /** Download is only meaningful when at least one page survives. */
  get canDownload(): boolean {
    return this.hasDocument && this.remainingCount > 0 && !this.loading;
  }

  trackByEntry(_index: number, page: PageEntry): number {
    return page.srcIndex;
  }

  // ---- Apply & download ---------------------------------------------------

  async applyAndDownload(): Promise<void> {
    if (!this.sourceBytes || !this.canDownload) return;

    this.loading = true;
    this.errorMessage = '';
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const src = await PDFDocument.load(this.sourceBytes, {
        ignoreEncryption: true
      });
      const out = await PDFDocument.create();

      for (const entry of this.pages) {
        if (entry.deleted) continue;
        const [copied] = await out.copyPages(src, [entry.srcIndex]);
        const srcPage = src.getPage(entry.srcIndex);
        const base = srcPage.getRotation().angle;
        copied.setRotation(degrees(this.normalize(base + entry.rotation)));
        out.addPage(copied);
      }

      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      this.utilityService.downloadBlob(blob, 'organized.pdf');
      this.toastService.success('Organized PDF downloaded');
    } catch (err: unknown) {
      this.errorMessage =
        'Failed to build the PDF. ' +
        (err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      this.loading = false;
    }
  }

  // ---- Reset --------------------------------------------------------------

  clear(): void {
    this.reset();
    this.errorMessage = '';
  }

  private reset(): void {
    this.pages = [];
    this.fileName = '';
    this.sourceBytes = null;
  }
}
