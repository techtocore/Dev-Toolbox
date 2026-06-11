import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';
import * as marked from 'marked';

@Component({
  selector: 'app-markdown',
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss'],
  standalone: false
})
export class MarkdownComponent implements OnInit {
  @ViewChild('markdownTextarea') markdownTextarea!: ElementRef<HTMLTextAreaElement>;

  markdownText = `# Welcome to the Markdown Editor

Start typing — the preview updates live, and the toolbar (or **Ctrl+B / Ctrl+I / Ctrl+K**) inserts formatting at the cursor.

## Features
- **Bold** and *italic* text
- [Links](https://example.com) and \`inline code\`
- Lists, tables, blockquotes
- Auto-generated table of contents

### Lists
1. Numbered item one
2. Numbered item two

### Code blocks
\`\`\`typescript
function hello(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> "Markdown is a lightweight markup language with plain-text formatting syntax."`;
  compiledMarkdown: string = '';
  isMobile = false;

  showToc = false;
  toc: { level: number; text: string; id: string }[] = [];

  // Stats
  wordCount = 0;
  charCount = 0;
  readingTimeMin = 0;

  constructor(
    public utilityService: UtilityService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.updatePreview();
  }

  updatePreview(): void {
    if (!this.markdownText) {
      this.compiledMarkdown = '';
      this.toc = [];
      this.wordCount = 0;
      this.charCount = 0;
      this.readingTimeMin = 0;
      return;
    }

    this.buildToc();
    const raw = String(marked.parse(this.markdownText));
    this.compiledMarkdown = this.sanitizeHtml(raw);

    this.charCount = this.markdownText.length;
    this.wordCount = (this.markdownText.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
    this.readingTimeMin = Math.max(1, Math.round(this.wordCount / 238));
  }

  // Strip the obvious script-injection vectors before binding to [innerHTML].
  // Not a substitute for DOMPurify, but blocks the common payloads that a
  // pasted markdown document could carry through marked's raw-HTML passthrough.
  private sanitizeHtml(html: string): string {
    return html
      // <script>…</script> and standalone <script ...> / </script>
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<\/?script\b[^>]*>/gi, '')
      // <iframe>, <object>, <embed>, <form>, <link>, <meta>, <base>
      .replace(/<\/?(?:iframe|object|embed|form|link|meta|base)\b[^>]*>/gi, '')
      // onclick="...", onerror='...', onload=foo — strip any on*=  handler.
      .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*[^\s"'>]+/gi, '')
      // Neutralize javascript:/vbscript: always, and data: URLs except inline
      // images (data:image/...), which are legitimate and safe to render.
      .replace(/(href|src|xlink:href)\s*=\s*("|')\s*(?:(?:javascript|vbscript)\s*:|data\s*:(?!\s*image\/))[^"']*\2/gi,
        '$1=$2#$2');
  }

  private buildToc(): void {
    const lines = this.markdownText.split('\n');
    const entries: { level: number; text: string; id: string }[] = [];
    let inCode = false;
    for (const line of lines) {
      if (/^(```|~~~)/.test(line)) inCode = !inCode;
      if (inCode) continue;
      const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (m) {
        const text = m[2];
        entries.push({
          level: m[1].length,
          text,
          id: text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
        });
      }
    }
    this.toc = entries;
  }

  // -------- Inserts --------

  insertMarkdown(before: string, after = '', placeholder = ''): void {
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.markdownText.substring(start, end);
    const textToInsert = selectedText || placeholder;

    this.markdownText =
      this.markdownText.substring(0, start) +
      before + textToInsert + after +
      this.markdownText.substring(end);
    this.updatePreview();

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }

  insertAtCursor(text: string): void {
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    this.markdownText =
      this.markdownText.substring(0, start) + text + this.markdownText.substring(end);
    this.updatePreview();
    setTimeout(() => {
      textarea.focus();
      const p = start + text.length;
      textarea.setSelectionRange(p, p);
    }, 0);
  }

  makeBold(): void          { this.insertMarkdown('**', '**', 'bold text'); }
  makeItalic(): void        { this.insertMarkdown('*',  '*',  'italic text'); }
  makeStrikethrough(): void { this.insertMarkdown('~~', '~~', 'strikethrough text'); }
  makeCode(): void          { this.insertMarkdown('`',  '`',  'code'); }
  insertLink(): void        { this.insertMarkdown('[', '](https://example.com)', 'link text'); }
  insertImage(): void       { this.insertMarkdown('![', '](https://example.com/image.jpg)', 'alt text'); }
  insertList(): void        { this.insertAtCursor('\n- List item\n'); }
  insertNumberedList(): void{ this.insertAtCursor('\n1. List item\n'); }
  insertCodeBlock(): void   { this.insertAtCursor('\n```\nYour code here\n```\n'); }
  insertHorizontalRule(): void { this.insertAtCursor('\n---\n'); }
  insertTable(): void {
    const table = '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n';
    this.insertAtCursor(table);
  }

  insertHeading(level: number): void {
    const hashes = '#'.repeat(level);
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const lineStart = this.markdownText.lastIndexOf('\n', start - 1) + 1;
    this.markdownText =
      this.markdownText.substring(0, lineStart) +
      hashes + ' ' +
      this.markdownText.substring(lineStart);
    this.updatePreview();
    textarea.focus();
  }

  insertQuote(): void {
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const lineStart = this.markdownText.lastIndexOf('\n', start - 1) + 1;
    this.markdownText =
      this.markdownText.substring(0, lineStart) +
      '> ' +
      this.markdownText.substring(lineStart);
    this.updatePreview();
    textarea.focus();
  }

  // -------- Keyboard shortcuts --------

  onKey(e: KeyboardEvent): void {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if      (k === 'b') { e.preventDefault(); this.makeBold(); }
    else if (k === 'i') { e.preventDefault(); this.makeItalic(); }
    else if (k === 'e') { e.preventDefault(); this.makeCode(); }
    else if (k === 'l') { e.preventDefault(); this.insertLink(); }
  }

  toggleToc(): void {
    this.showToc = !this.showToc;
  }

  clear(): void {
    this.markdownText = '';
    this.updatePreview();
  }

  downloadMarkdown(): void {
    this.utilityService.downloadFile(this.markdownText, 'text/markdown', 'document.md');
  }

  downloadHtml(): void {
    if (!this.compiledMarkdown) {
      this.toastService.warning('Nothing to export — write some markdown first.');
      return;
    }
    const html = this.buildStandaloneHtml(this.compiledMarkdown);
    this.utilityService.downloadFile(html, 'text/html', 'document.html');
  }

  copyMarkdown(): void {
    this.utilityService.copyToClipboard(this.markdownText, { label: 'Markdown copied' });
  }

  copyHtml(): void {
    if (!this.compiledMarkdown) {
      this.toastService.warning('Nothing to copy.');
      return;
    }
    this.utilityService.copyToClipboard(this.compiledMarkdown, { label: 'HTML copied' });
  }

  private buildStandaloneHtml(body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Document</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1.25rem; line-height: 1.65; color: #1a202c; }
  h1, h2, h3 { line-height: 1.25; }
  pre { background: #f5f7fa; padding: 1em; border-radius: 6px; overflow: auto; }
  code { background: #f5f7fa; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #cbd5e0; padding: 0.25em 1em; color: #4a5568; margin: 1em 0; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; }
  th { background: #f7fafc; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
  }
}
