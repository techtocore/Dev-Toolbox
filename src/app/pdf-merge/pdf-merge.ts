import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

interface MergeEntry {
  file: File;
  name: string;
  sizeLabel: string;
  pages: number;
}

@Component({
  selector: 'app-pdf-merge',
  standalone: false,
  templateUrl: './pdf-merge.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pdf-merge.scss'
})
export class PdfMerge implements OnDestroy {
  /** Ordered list of PDFs queued for merging. */
  files: MergeEntry[] = [];

  isLoading: boolean = false;
  errorMessage: string = '';

  /** Reject absurdly large files early so we don't lock the browser. */
  private readonly maxBytes = 150 * 1024 * 1024; // 150 MB per file

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  /** Total page count across every queued PDF. */
  get totalPages(): number {
    return this.files.reduce((sum, f) => sum + f.pages, 0);
  }

  /** Need at least two PDFs before a merge makes sense. */
  get canMerge(): boolean {
    return this.files.length >= 2 && !this.isLoading;
  }

  // ---- Drag & drop / file picking ----------------------------------------

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

  /** Validate, read page counts, and append each selected file in order. */
  async handleFiles(fileList: FileList): Promise<void> {
    this.errorMessage = '';
    const incoming = Array.from(fileList);
    this.isLoading = true;

    // Collect every skip/failure reason so dropping several bad files at once
    // reports all of them, not just the last one.
    const problems: string[] = [];
    let added = 0;

    try {
      const { PDFDocument } = await import('pdf-lib');

      for (const file of incoming) {
        const isPdf =
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          problems.push(`"${file.name}" — not a PDF file`);
          continue;
        }
        if (file.size === 0) {
          problems.push(`"${file.name}" — the file is empty`);
          continue;
        }
        if (file.size > this.maxBytes) {
          problems.push(`"${file.name}" — larger than 150 MB`);
          continue;
        }

        try {
          const bytes = await file.arrayBuffer();
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          if (doc.isEncrypted) {
            // pdf-lib can't decrypt; merging encrypted content yields garbage.
            problems.push(`"${file.name}" — encrypted / password-protected`);
            continue;
          }
          this.files.push({
            file,
            name: file.name,
            sizeLabel: this.formatSize(file.size),
            pages: doc.getPageCount()
          });
          added++;
        } catch {
          problems.push(`"${file.name}" — could not be read (corrupt or invalid)`);
        }
      }

      if (problems.length) {
        this.errorMessage =
          problems.length === incoming.length
            ? `None of the ${incoming.length} file(s) could be added: ${problems.join('; ')}.`
            : `Added ${added} of ${incoming.length} file(s). Skipped ${problems.length}: ${problems.join('; ')}.`;
      }
    } catch (err: unknown) {
      this.errorMessage = this.toMessage(err, 'Failed to load PDF library.');
    } finally {
      this.isLoading = false;
    }
  }

  // ---- List management ----------------------------------------------------

  moveUp(index: number): void {
    if (index <= 0 || index >= this.files.length) {
      return;
    }
    [this.files[index - 1], this.files[index]] = [
      this.files[index],
      this.files[index - 1]
    ];
  }

  moveDown(index: number): void {
    if (index < 0 || index >= this.files.length - 1) {
      return;
    }
    [this.files[index + 1], this.files[index]] = [
      this.files[index],
      this.files[index + 1]
    ];
  }

  remove(index: number): void {
    this.files.splice(index, 1);
    this.errorMessage = '';
  }

  clearAll(): void {
    this.files = [];
    this.errorMessage = '';
  }

  // ---- Merge --------------------------------------------------------------

  async merge(): Promise<void> {
    if (!this.canMerge) {
      return;
    }
    this.errorMessage = '';
    this.isLoading = true;

    try {
      const { PDFDocument } = await import('pdf-lib');
      const out = await PDFDocument.create();

      for (const entry of this.files) {
        const bytes = await entry.file.arrayBuffer();
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copied = await out.copyPages(src, src.getPageIndices());
        for (const page of copied) {
          out.addPage(page);
        }
      }

      const merged = await out.save();
      const blob = new Blob([merged as BlobPart], { type: 'application/pdf' });
      this.utilityService.downloadBlob(blob, 'merged.pdf');
      this.toastService.success('Merged PDF downloaded');
    } catch (err: unknown) {
      this.errorMessage = this.toMessage(
        err,
        'Something went wrong while merging the PDFs.'
      );
    } finally {
      this.isLoading = false;
    }
  }

  // ---- Helpers ------------------------------------------------------------

  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const units = ['KB', 'MB', 'GB'];
    let size = bytes / 1024;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(1)} ${units[unit]}`;
  }

  private toMessage(err: unknown, fallback: string): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }

  ngOnDestroy(): void {
    this.files = [];
  }
}
