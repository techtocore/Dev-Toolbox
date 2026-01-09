import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

@Component({
  selector: 'app-regex-tester',
  standalone: false,
  templateUrl: './regex-tester.html',
  styleUrl: './regex-tester.scss',
})
export class RegexTester implements OnInit {
  regexPattern = '';
  testString = '';
  flags = {
    global: true,
    multiline: false,
    caseInsensitive: false,
    dotAll: false,
    unicode: false,
    sticky: false
  };
  matches: RegExpMatchArray | null = null;
  matchCount = 0;
  isValid = true;
  errorMessage = '';
  highlightedText = '';
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  testRegex() {
    if (!this.regexPattern || !this.testString) {
      this.clearResults();
      return;
    }

    try {
      const flagString = this.getFlagString();
      const regex = new RegExp(this.regexPattern, flagString);
      
      this.isValid = true;
      this.errorMessage = '';

      // Get all matches
      if (this.flags.global) {
        this.matches = this.testString.match(regex);
        this.matchCount = this.matches ? this.matches.length : 0;
      } else {
        const match = this.testString.match(regex);
        this.matches = match;
        this.matchCount = match ? 1 : 0;
      }

      // Highlight matches in the text
      this.highlightMatches(regex);
    } catch (error: any) {
      this.isValid = false;
      this.errorMessage = error.message || 'Invalid regular expression';
      this.clearResults();
    }
  }

  highlightMatches(regex: RegExp): void {
    if (!this.testString) {
      this.highlightedText = '';
      return;
    }

    const matches: Array<{ index: number; length: number }> = [];
    const MAX_MATCHES = 10000; // Safety limit to prevent infinite loops

    // Find all match positions
    const globalRegex = new RegExp(regex.source, this.getFlagString() + (this.flags.global ? '' : 'g'));
    let match;
    let iterations = 0;

    while ((match = globalRegex.exec(this.testString)) !== null) {
      matches.push({ index: match.index, length: match[0].length });
      if (!this.flags.global) break;

      // Safety check to prevent infinite loops with zero-length matches
      if (match[0].length === 0) {
        globalRegex.lastIndex++;
      }

      // Safety limit on iterations
      iterations++;
      if (iterations >= MAX_MATCHES) {
        this.errorMessage = `Too many matches (>${MAX_MATCHES}). Please refine your pattern.`;
        this.isValid = false;
        break;
      }
    }

    // Build highlighted text by escaping HTML first, then adding marks
    let result = '';
    let lastIndex = 0;

    matches.forEach(m => {
      // Add text before match (escaped)
      result += this.escapeHtml(this.testString.substring(lastIndex, m.index));
      // Add matched text with mark tags (escaped content)
      result += '<mark>' + this.escapeHtml(this.testString.substring(m.index, m.index + m.length)) + '</mark>';
      lastIndex = m.index + m.length;
    });

    // Add remaining text after last match (escaped)
    result += this.escapeHtml(this.testString.substring(lastIndex));

    this.highlightedText = result;
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getFlagString(): string {
    let flags = '';
    if (this.flags.global) flags += 'g';
    if (this.flags.multiline) flags += 'm';
    if (this.flags.caseInsensitive) flags += 'i';
    if (this.flags.dotAll) flags += 's';
    if (this.flags.unicode) flags += 'u';
    if (this.flags.sticky) flags += 'y';
    return flags;
  }

  clearResults() {
    this.matches = null;
    this.matchCount = 0;
    this.highlightedText = '';
  }

  clear() {
    this.regexPattern = '';
    this.testString = '';
    this.clearResults();
    this.isValid = true;
    this.errorMessage = '';
  }

  async copyToClipboard(text: string): Promise<void> {
    await this.utilityService.copyToClipboard(text);
  }
}
