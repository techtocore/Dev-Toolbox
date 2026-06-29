import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-pdf-split',
  standalone: false,
  templateUrl: './pdf-split.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pdf-split.scss'
})
export class PdfSplit implements OnDestroy {
  /** Currently loaded PDF file. */
  fileName: string = '';
  /** Raw bytes of the loaded PDF, kept so we can re-run extractions without re-reading. */
  private pdfBytes: Uint8Array | null = null;
  /** Total page count of the loaded document. */
  pageCount: number = 0;

  /** Raw page-selection string, e.g. "1-3, 5, 8-10" (1-based). */
  selection: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';

  /** Max accepted file size (50 MB) to avoid runaway parses. */
  private readonly maxBytes = 50 * 1024 * 1024;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnDestroy(): void {
    this.pdfBytes = null;
  }

  // ---- Upload / dropzone handlers ----

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

  private async handleFiles(files: FileList): Promise<void> {
    const file = files[0];
    this.errorMessage = '';

    // Drop any previously loaded document up front so an invalid pick/drop
    // leaves the tool in a clean empty state instead of showing the old
    // success banner alongside the new error.
    this.resetDocument();
    this.fileName = '';

    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.pdf') && file.type !== 'application/pdf') {
      this.errorMessage = 'Please choose a PDF file.';
      return;
    }
    if (file.size === 0) {
      this.errorMessage = 'That file is empty.';
      return;
    }
    if (file.size > this.maxBytes) {
      this.errorMessage = 'That PDF is too large (max 50 MB).';
      return;
    }

    this.isLoading = true;
    this.resetDocument();

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

      // pdf-lib can't decrypt — ignoreEncryption only suppresses the throw, the
      // content streams stay encrypted. Refuse up front instead of emitting a
      // corrupt extract.
      if (doc.isEncrypted) {
        this.errorMessage = 'This PDF is encrypted / password-protected and cannot be split in the browser. Remove the password first.';
        this.resetDocument();
        return;
      }

      this.pdfBytes = bytes;
      this.pageCount = doc.getPageCount();
      this.fileName = file.name;

      if (this.pageCount === 0) {
        this.errorMessage = 'This PDF has no pages.';
        this.resetDocument();
        return;
      }

      // Default to every page so the action is usable immediately.
      this.selectAll();
      this.toastService.info(`Loaded ${file.name} (${this.pageCount} page${this.pageCount === 1 ? '' : 's'})`);
    } catch (err: any) {
      this.errorMessage = err?.message
        ? `Could not read this PDF: ${err.message}`
        : 'Could not read this PDF. It may be corrupt or not a valid PDF.';
      this.resetDocument();
    } finally {
      this.isLoading = false;
    }
  }

  // ---- Quick selection helpers ----

  selectAll(): void {
    if (this.pageCount === 0) return;
    this.selection = `1-${this.pageCount}`;
    this.errorMessage = '';
  }

  selectFirstHalf(): void {
    if (this.pageCount === 0) return;
    const end = Math.ceil(this.pageCount / 2);
    this.selection = end > 1 ? `1-${end}` : '1';
    this.errorMessage = '';
  }

  selectSecondHalf(): void {
    if (this.pageCount === 0) return;
    const start = Math.ceil(this.pageCount / 2) + 1;
    if (start > this.pageCount) {
      // Only one page — second half is just that page.
      this.selection = `${this.pageCount}`;
    } else {
      this.selection = start === this.pageCount ? `${start}` : `${start}-${this.pageCount}`;
    }
    this.errorMessage = '';
  }

  onSelectionChange(): void {
    // Clear stale errors as the user edits the selection.
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  /**
   * Parse a 1-based selection string like "1-3, 5, 8-10" into ordered, in-range,
   * 0-based page indices. Throws on garbage or out-of-range values.
   */
  parseSelection(text: string): number[] {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      throw new Error('Enter a page selection, e.g. "1-3, 5, 8-10".');
    }

    const indices: number[] = [];
    const parts = trimmed.split(',');

    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (!part) continue; // tolerate trailing/double commas

      const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
      const singleMatch = part.match(/^(\d+)$/);

      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        this.assertInRange(start, part);
        this.assertInRange(end, part);
        if (start <= end) {
          for (let p = start; p <= end; p++) indices.push(p - 1);
        } else {
          // Allow descending ranges (e.g. "5-1") to reverse pages.
          for (let p = start; p >= end; p--) indices.push(p - 1);
        }
      } else if (singleMatch) {
        const p = parseInt(singleMatch[1], 10);
        this.assertInRange(p, part);
        indices.push(p - 1);
      } else {
        throw new Error(`"${part}" is not a valid page or range.`);
      }
    }

    if (indices.length === 0) {
      throw new Error('No pages selected.');
    }
    return indices;
  }

  private assertInRange(page: number, part: string): void {
    if (page < 1 || page > this.pageCount) {
      throw new Error(`Page ${page} in "${part}" is out of range (1-${this.pageCount}).`);
    }
  }

  /** Live preview of how many pages will be extracted, for the button label. */
  get selectedCount(): number {
    if (!this.pdfBytes || this.pageCount === 0) return 0;
    try {
      return this.parseSelection(this.selection).length;
    } catch {
      return 0;
    }
  }

  // ---- Extract & download ----

  async extract(): Promise<void> {
    this.errorMessage = '';

    if (!this.pdfBytes || this.pageCount === 0) {
      this.errorMessage = 'Load a PDF first.';
      return;
    }

    let indices: number[];
    try {
      indices = this.parseSelection(this.selection);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Invalid page selection.';
      return;
    }

    this.isLoading = true;
    try {
      const { PDFDocument } = await import('pdf-lib');
      const source = await PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();

      const copied = await out.copyPages(source, indices);
      copied.forEach(page => out.addPage(page));

      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      this.utilityService.downloadBlob(blob, 'extracted.pdf');
      this.toastService.success(`Extracted ${indices.length} page${indices.length === 1 ? '' : 's'}`);
    } catch (err: any) {
      this.errorMessage = err?.message
        ? `Extraction failed: ${err.message}`
        : 'Extraction failed.';
    } finally {
      this.isLoading = false;
    }
  }

  clear(): void {
    this.resetDocument();
    this.fileName = '';
    this.errorMessage = '';
  }

  private resetDocument(): void {
    this.pdfBytes = null;
    this.pageCount = 0;
    this.selection = '';
  }
}
