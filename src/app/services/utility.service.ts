import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

export interface CsvParseLimits {
  maxRows?: number;
  maxColumns?: number;
  maxCellLength?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UtilityService {

  isMobile: boolean = false;
  constructor(private toastService: ToastService) { }

  getIsMobile(): boolean {
    return this.isMobile;
  }

  setIsMobile(flag: boolean): void {
    this.isMobile = flag;
  }

  /**
   * Parses CSV/TSV text into rows of fields in a single pass that respects
   * RFC-4180 quoting — delimiters, quotes, and newlines are all allowed inside
   * double-quoted fields, and a doubled quote (`""`) becomes one literal quote.
   *
   * Unquoted fields are trimmed for convenience (`a, b, c`); quoted fields are
   * preserved verbatim so significant leading/trailing spaces survive. Fully
   * empty rows (blank lines) are dropped, matching the previous behaviour.
   */
  parseCsv(text: string, delimiter = ',', limits: CsvParseLimits = {}): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let quoted = false; // the current field contained a quoted section

    const appendField = (value: string) => {
      field += value;
      if (limits.maxCellLength && field.length > limits.maxCellLength) {
        throw new Error(`CSV cell exceeds the ${limits.maxCellLength.toLocaleString()} character limit`);
      }
    };
    const pushField = () => {
      row.push(quoted ? field : field.trim());
      if (limits.maxColumns && row.length > limits.maxColumns) {
        throw new Error(`CSV row exceeds the ${limits.maxColumns.toLocaleString()} column limit`);
      }
      field = '';
      quoted = false;
    };
    const pushRow = () => {
      pushField();
      // Drop a fully empty row (a blank line), but keep `,,` (real empty fields).
      if (!(row.length === 1 && row[0] === '')) {
        if (limits.maxRows && rows.length >= limits.maxRows) {
          throw new Error(`CSV exceeds the ${limits.maxRows.toLocaleString()} row limit`);
        }
        rows.push(row);
      }
      row = [];
    };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') { appendField('"'); i++; }
          else { inQuotes = false; }
        } else {
          appendField(char);
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
        quoted = true;
      } else if (char === delimiter) {
        pushField();
      } else if (char === '\r') {
        pushRow();
        if (text[i + 1] === '\n') i++; // treat \r\n as a single break
      } else if (char === '\n') {
        pushRow();
      } else {
        appendField(char);
      }
    }

    // Flush the final field/row when the text has no trailing newline.
    if (field !== '' || quoted || row.length > 0) {
      pushRow();
    }
    return rows;
  }

  serializeCsvRow(
    values: readonly unknown[],
    delimiter = ',',
    protectSpreadsheetFormulas = true
  ): string {
    return values
      .map(value => this.serializeCsvCell(value, delimiter, protectSpreadsheetFormulas))
      .join(delimiter);
  }

  serializeCsvCell(
    value: unknown,
    delimiter = ',',
    protectSpreadsheetFormulas = true
  ): string {
    let text = value == null ? '' : String(value);
    if (protectSpreadsheetFormulas && /^\s*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    if (
      text.includes(delimiter) ||
      text.includes('"') ||
      text.includes('\n') ||
      text.includes('\r') ||
      /^\s|\s$/.test(text)
    ) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  downloadFile(data: string, contentType: string, fileName: string): void {
    this.downloadBlob(new window.Blob([data], { type: contentType }), fileName);
  }

  /**
   * Download an arbitrary Blob (binary-safe — used by the PDF / image tools for
   * Uint8Array / canvas output that the string-based downloadFile can't carry).
   */
  downloadBlob(blob: Blob, fileName: string): void {
    const downloadAnchor = document.createElement("a");
    downloadAnchor.style.display = "none";

    const fileURL = URL.createObjectURL(blob);
    downloadAnchor.href = fileURL;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // Revoke the object URL after a short delay to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(fileURL);
    }, 100);
  }

  normalizeDownloadName(name: string, extension: string, fallback: string): string {
    const cleanExtension = extension.replace(/^\.+/, '').toLowerCase();
    const suffix = `.${cleanExtension}`;
    let base = (name || '').trim();
    if (base.toLowerCase().endsWith(suffix)) {
      base = base.slice(0, -suffix.length);
    }
    base = Array.from(base, character => character.charCodeAt(0) < 32 ? '-' : character)
      .join('')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim();
    return `${base || fallback}${suffix}`;
  }

  readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = (evt: ProgressEvent<FileReader>) => {
        // For a successful readAsText the result is always a string ('' for a
        // 0-byte file) — null-check rather than truthiness so an empty or
        // whitespace-only file resolves to '' instead of being rejected.
        const result = evt.target?.result;
        if (result != null) {
          resolve(result as string);
        } else {
          reject("No content read from file");
        }
      }
      reader.onerror = () => {
        reject("Error reading file");
      }
    });
  }

  /**
   * Copy text to clipboard with proper error handling and fallback.
   * Emits a toast on completion unless `silent: true` is passed.
   */
  async copyToClipboard(
    text: string,
    options: { silent?: boolean; label?: string } = {}
  ): Promise<boolean> {
    const ok = await this.tryCopy(text);
    if (!options.silent) {
      if (ok) {
        this.toastService.success(options.label || 'Copied to clipboard');
      } else {
        this.toastService.error('Could not copy to clipboard');
      }
    }
    return ok;
  }

  private async tryCopy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return this.copyToClipboardFallback(text);
    } catch (error) {
      console.error('Clipboard API failed, trying fallback:', error);
      return this.copyToClipboardFallback(text);
    }
  }

  /**
   * Fallback method for copying to clipboard using document.execCommand
   * @param text Text to copy
   * @returns true if successful, false otherwise
   */
  private copyToClipboardFallback(text: string): boolean {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (error) {
      console.error('Fallback clipboard copy failed:', error);
      return false;
    }
  }
}
