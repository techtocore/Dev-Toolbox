import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UtilityService } from '../services/utility.service'
import * as marked from 'marked';

@Component({
  selector: 'app-markdown',
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss'],
  standalone: false
})
export class MarkdownComponent implements OnInit {
  @ViewChild('markdownTextarea') markdownTextarea!: ElementRef<HTMLTextAreaElement>;

  markdownText = '# Welcome to Markdown Editor\n\nStart typing or use the toolbar above to format your text.\n\n## Features\n- **Bold text**\n- *Italic text*\n- [Links](https://example.com)\n- `Code`\n\n### Lists\n1. Numbered item 1\n2. Numbered item 2\n\n### Code Blocks\n```\nYour code here\n```';
  compiledMarkdown: any;
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.updatePreview();
  }

  updatePreview() {
    if (this.markdownText) {
      this.compiledMarkdown = marked.parse(this.markdownText);
    } else {
      this.compiledMarkdown = '';
    }
  }

  insertMarkdown(before: string, after: string = '', placeholder: string = '') {
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.markdownText.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = this.markdownText.substring(0, start) + 
                    before + textToInsert + after + 
                    this.markdownText.substring(end);
    
    this.markdownText = newText;
    this.updatePreview();
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }

  insertAtCursor(text: string) {
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    this.markdownText = this.markdownText.substring(0, start) + 
                        text + 
                        this.markdownText.substring(end);
    
    this.updatePreview();
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + text.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }

  makeBold() {
    this.insertMarkdown('**', '**', 'bold text');
  }

  makeItalic() {
    this.insertMarkdown('*', '*', 'italic text');
  }

  makeStrikethrough() {
    this.insertMarkdown('~~', '~~', 'strikethrough text');
  }

  makeCode() {
    this.insertMarkdown('`', '`', 'code');
  }

  insertHeading(level: number) {
    const hashes = '#'.repeat(level);
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const lineStart = this.markdownText.lastIndexOf('\n', start - 1) + 1;
    
    this.markdownText = this.markdownText.substring(0, lineStart) + 
                        hashes + ' ' + 
                        this.markdownText.substring(lineStart);
    
    this.updatePreview();
    textarea.focus();
  }

  insertLink() {
    this.insertMarkdown('[', '](https://example.com)', 'link text');
  }

  insertImage() {
    this.insertMarkdown('![', '](https://example.com/image.jpg)', 'alt text');
  }

  insertList() {
    this.insertAtCursor('\n- List item\n');
  }

  insertNumberedList() {
    this.insertAtCursor('\n1. List item\n');
  }

  insertCodeBlock() {
    this.insertAtCursor('\n```\nYour code here\n```\n');
  }

  insertQuote() {
    const textarea = this.markdownTextarea.nativeElement;
    const start = textarea.selectionStart;
    const lineStart = this.markdownText.lastIndexOf('\n', start - 1) + 1;
    
    this.markdownText = this.markdownText.substring(0, lineStart) + 
                        '> ' + 
                        this.markdownText.substring(lineStart);
    
    this.updatePreview();
    textarea.focus();
  }

  insertTable() {
    const table = '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n';
    this.insertAtCursor(table);
  }

  insertHorizontalRule() {
    this.insertAtCursor('\n---\n');
  }

  clear() {
    this.markdownText = '';
    this.updatePreview();
  }

  downloadMarkdown() {
    const blob = new Blob([this.markdownText], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async copyMarkdown(): Promise<void> {
    await this.utilityService.copyToClipboard(this.markdownText);
  }
}
