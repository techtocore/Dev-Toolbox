import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

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

  downloadFile(data: string, contentType: string, fileName: string): void {
    const file = new window.Blob([data], { type: contentType });

    const downloadAnchor = document.createElement("a");
    downloadAnchor.style.display = "none";

    const fileURL = URL.createObjectURL(file);
    downloadAnchor.href = fileURL;
    downloadAnchor.download = fileName;
    downloadAnchor.click();

    // Revoke the object URL after a short delay to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(fileURL);
    }, 100);
  }

  readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = (evt: ProgressEvent<FileReader>) => {
        if (evt.target?.result) {
          resolve(evt.target.result as string);
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
