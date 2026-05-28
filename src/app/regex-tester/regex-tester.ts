import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

type Mode = 'test' | 'replace';

interface CheatsheetEntry {
  pattern: string;
  description: string;
}

interface PatternRecipe {
  name: string;
  pattern: string;
  flags: string;
}

@Component({
  selector: 'app-regex-tester',
  standalone: false,
  templateUrl: './regex-tester.html',
  styleUrl: './regex-tester.scss',
})
export class RegexTester implements OnInit {
  mode: Mode = 'test';
  regexPattern = '';
  testString = '';
  replacement = '';
  replaceOutput = '';

  flags = {
    global: true,
    multiline: false,
    caseInsensitive: false,
    dotAll: false,
    unicode: false,
    sticky: false
  };

  matches: string[] = [];
  matchCount = 0;
  isValid = true;
  errorMessage = '';
  highlightedText = '';
  isMobile = false;

  cheatsheetOpen = false;

  // Quick-pick library
  recipes: PatternRecipe[] = [
    { name: 'Email',             pattern: '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+', flags: 'g' },
    { name: 'URL',               pattern: 'https?://[\\w.-]+(?:\\.[\\w.-]+)+[\\w\\-._~:/?#[\\]@!$&\'()*+,;=]*', flags: 'g' },
    { name: 'IPv4',              pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
    { name: 'UUID',              pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', flags: 'g' },
    { name: 'Hex color',         pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'g' },
    { name: 'US phone',          pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', flags: 'g' },
    { name: 'ISO date',          pattern: '\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z?)?', flags: 'g' },
    { name: 'Integer',           pattern: '-?\\d+', flags: 'g' },
    { name: 'Float',             pattern: '-?\\d+(?:\\.\\d+)?', flags: 'g' },
    { name: 'Slug',              pattern: '\\b[a-z0-9]+(?:-[a-z0-9]+)*\\b', flags: 'g' },
    { name: 'Whitespace lines',  pattern: '^\\s*$', flags: 'gm' },
    { name: 'HTML tag',          pattern: '<\\/?[a-zA-Z][^>]*>', flags: 'g' },
  ];

  cheatsheet: { section: string; entries: CheatsheetEntry[] }[] = [
    {
      section: 'Character classes',
      entries: [
        { pattern: '.',       description: 'Any character (except newline; with /s, includes newline)' },
        { pattern: '\\d \\D', description: 'Digit / non-digit' },
        { pattern: '\\w \\W', description: 'Word char [A-Za-z0-9_] / non-word' },
        { pattern: '\\s \\S', description: 'Whitespace / non-whitespace' },
        { pattern: '[abc]',   description: 'Any of a, b, c' },
        { pattern: '[^abc]',  description: 'Not a, b, or c' },
        { pattern: '[a-z]',   description: 'Range a–z' },
      ]
    },
    {
      section: 'Anchors & boundaries',
      entries: [
        { pattern: '^',  description: 'Start of string (or line with /m)' },
        { pattern: '$',  description: 'End of string (or line with /m)' },
        { pattern: '\\b',description: 'Word boundary' },
        { pattern: '\\B',description: 'Non-word boundary' },
      ]
    },
    {
      section: 'Quantifiers',
      entries: [
        { pattern: '*',   description: '0 or more' },
        { pattern: '+',   description: '1 or more' },
        { pattern: '?',   description: '0 or 1' },
        { pattern: '{n}', description: 'Exactly n' },
        { pattern: '{n,}',description: 'n or more' },
        { pattern: '{n,m}',description: 'Between n and m' },
        { pattern: '*?',  description: 'Lazy (smallest possible match)' },
      ]
    },
    {
      section: 'Groups & lookarounds',
      entries: [
        { pattern: '(abc)',     description: 'Capturing group' },
        { pattern: '(?:abc)',   description: 'Non-capturing group' },
        { pattern: '(?<name>x)',description: 'Named group' },
        { pattern: '(?=abc)',   description: 'Positive lookahead' },
        { pattern: '(?!abc)',   description: 'Negative lookahead' },
        { pattern: '(?<=abc)',  description: 'Positive lookbehind' },
        { pattern: '(?<!abc)',  description: 'Negative lookbehind' },
      ]
    },
    {
      section: 'Replace tokens',
      entries: [
        { pattern: '$&',  description: 'The whole match' },
        { pattern: '$1', description: 'First capture group' },
        { pattern: '$<name>', description: 'Named capture group' },
        { pattern: '$$',  description: 'Literal $' },
      ]
    }
  ];

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  setMode(m: Mode): void {
    this.mode = m;
    this.run();
  }

  run(): void {
    if (!this.regexPattern || !this.testString) {
      this.clearResults();
      return;
    }

    let regex: RegExp;
    try {
      regex = new RegExp(this.regexPattern, this.getFlagString());
      this.isValid = true;
      this.errorMessage = '';
    } catch (error: any) {
      this.isValid = false;
      this.errorMessage = error?.message || 'Invalid regular expression';
      this.clearResults();
      return;
    }

    const positions = this.findAll(regex);

    this.matches = positions.map(p => this.testString.substring(p.index, p.index + p.length));
    this.matchCount = positions.length;
    this.buildHighlightedHtml(positions);

    if (this.mode === 'replace') {
      try {
        // Use a fresh regex with `g` so .replace replaces everywhere when "Global" is set.
        const replaceRegex = new RegExp(this.regexPattern, this.getFlagString());
        this.replaceOutput = this.testString.replace(replaceRegex, this.replacement);
      } catch (e: any) {
        this.replaceOutput = '';
        this.errorMessage = e?.message || 'Replacement failed';
        this.isValid = false;
      }
    }
  }

  private findAll(regex: RegExp): { index: number; length: number }[] {
    const MAX = 10000;
    const out: { index: number; length: number }[] = [];
    const r = new RegExp(regex.source, this.getFlagString() + (this.flags.global ? '' : 'g'));
    let m: RegExpExecArray | null;
    let iterations = 0;

    while ((m = r.exec(this.testString)) !== null) {
      out.push({ index: m.index, length: m[0].length });
      if (!this.flags.global) break;
      if (m[0].length === 0) r.lastIndex++;
      if (++iterations >= MAX) {
        this.errorMessage = `Too many matches (>${MAX}). Refine your pattern.`;
        this.isValid = false;
        break;
      }
    }
    return out;
  }

  private buildHighlightedHtml(positions: { index: number; length: number }[]): void {
    if (!this.testString) {
      this.highlightedText = '';
      return;
    }
    let result = '';
    let lastIndex = 0;
    for (const p of positions) {
      result += this.escapeHtml(this.testString.substring(lastIndex, p.index));
      result += '<mark>' + this.escapeHtml(this.testString.substring(p.index, p.index + p.length)) + '</mark>';
      lastIndex = p.index + p.length;
    }
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
    if (this.flags.global)         flags += 'g';
    if (this.flags.multiline)      flags += 'm';
    if (this.flags.caseInsensitive)flags += 'i';
    if (this.flags.dotAll)         flags += 's';
    if (this.flags.unicode)        flags += 'u';
    if (this.flags.sticky)         flags += 'y';
    return flags;
  }

  loadRecipe(r: PatternRecipe): void {
    this.regexPattern = r.pattern;
    this.flags.global = r.flags.includes('g');
    this.flags.multiline = r.flags.includes('m');
    this.flags.caseInsensitive = r.flags.includes('i');
    this.flags.dotAll = r.flags.includes('s');
    this.flags.unicode = r.flags.includes('u');
    this.flags.sticky = r.flags.includes('y');
    this.run();
  }

  loadSampleText(): void {
    this.testString = `Order #4521 placed on 2026-03-14 by alice@example.com.
Backup contact: bob+work@dev-toolbox.io (phone: 555-987-1234).
Reference: 550e8400-e29b-41d4-a716-446655440000.
Total: $1,249.99 USD. Status: pending → shipped.`;
    this.run();
  }

  copyAllMatches(): void {
    if (this.matches.length === 0) return;
    this.utilityService.copyToClipboard(this.matches.join('\n'), {
      label: `${this.matches.length} matches copied`
    });
  }

  copyOutput(): void {
    if (!this.replaceOutput) return;
    this.utilityService.copyToClipboard(this.replaceOutput, { label: 'Replaced text copied' });
  }

  clearResults(): void {
    this.matches = [];
    this.matchCount = 0;
    this.highlightedText = '';
    this.replaceOutput = '';
  }

  clear(): void {
    this.regexPattern = '';
    this.testString = '';
    this.replacement = '';
    this.clearResults();
    this.isValid = true;
    this.errorMessage = '';
  }

  copyToClipboard(text: string): void {
    this.utilityService.copyToClipboard(text, { label: 'Match copied' });
  }
}
