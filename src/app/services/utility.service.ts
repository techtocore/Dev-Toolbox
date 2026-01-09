import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilityService {

  isMobile: boolean = false;
  constructor() { }

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
   * Copy text to clipboard with proper error handling and fallback
   * @param text Text to copy to clipboard
   * @returns Promise that resolves to true if successful, false otherwise
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers or non-HTTPS contexts
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
