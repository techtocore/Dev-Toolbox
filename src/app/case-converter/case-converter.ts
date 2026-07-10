import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface CaseResult {
  key: string;
  label: string;
  hint: string;
  value: string;
}

/**
 * Case Converter — turn any text into the casing convention you need.
 *
 * Two families of transforms:
 *  • "Identifier" cases (camel, Pascal, snake, kebab, CONSTANT, dot, Train,
 *    slug) tokenise the input into words — existing punctuation, spacing and
 *    mixed casing are all normalised away — then re-join with the target style.
 *  • "Text" cases (Title, Sentence, UPPER, lower) preserve the original layout
 *    (line breaks and punctuation) and only re-case letters, which is what you
 *    want when re-casing prose rather than an identifier.
 */
@Component({
  selector: 'app-case-converter',
  standalone: false,
  templateUrl: './case-converter.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './case-converter.scss',
})
export class CaseConverter implements OnInit {
  input = 'Dev Toolbox: convert_any-text into ANY case!';
  isMobile = false;

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  /**
   * Split arbitrary text into lower-cased words, understanding camelCase /
   * PascalCase boundaries, acronyms (HTMLParser -> HTML, Parser) and any
   * separator run (spaces, _, -, ., /, etc.).
   */
  words(text: string): string[] {
    return text
      // digit/lower followed by an upper starts a new word: fooBar -> foo Bar
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      // ACRONYM followed by a Word: HTMLParser -> HTML Parser
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // split at letter<->digit boundaries so "abc123def" -> abc 123 def
      .replace(/([A-Za-z])(\d)/g, '$1 $2')
      .replace(/(\d)([A-Za-z])/g, '$1 $2')
      // any non-alphanumeric run becomes a boundary
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase());
  }

  private cap(word: string): string {
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  }

  private camel(w: string[]): string {
    return w.map((word, i) => (i === 0 ? word : this.cap(word))).join('');
  }

  private pascal(w: string[]): string {
    return w.map((word) => this.cap(word)).join('');
  }

  // ---- Text transforms that preserve the original layout ----

  private titleCase(text: string): string {
    return text.toLowerCase().replace(/\b\p{L}[\p{L}\p{N}]*/gu, (m) => this.cap(m));
  }

  private sentenceCase(text: string): string {
    const lower = text.toLowerCase();
    // Capitalise the first letter, and the first letter after a . ! or ?
    return lower.replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_m, lead: string, ch: string) => lead + ch.toUpperCase());
  }

  get results(): CaseResult[] {
    const w = this.words(this.input);
    const raw = this.input;
    return [
      { key: 'camel',    label: 'camelCase',      hint: 'Variables, JS/TS members',   value: this.camel(w) },
      { key: 'pascal',   label: 'PascalCase',     hint: 'Classes, types, components',  value: this.pascal(w) },
      { key: 'snake',    label: 'snake_case',     hint: 'Python, SQL columns',         value: w.join('_') },
      { key: 'constant', label: 'CONSTANT_CASE',  hint: 'Env vars, constants',         value: w.join('_').toUpperCase() },
      { key: 'kebab',    label: 'kebab-case',     hint: 'CSS, files, CLI flags',       value: w.join('-') },
      { key: 'train',    label: 'Train-Case',     hint: 'HTTP headers',                value: w.map((x) => this.cap(x)).join('-') },
      { key: 'dot',      label: 'dot.case',       hint: 'Namespaces, config keys',     value: w.join('.') },
      { key: 'slug',     label: 'url-slug',       hint: 'URL / anchor slug',           value: w.join('-') },
      { key: 'title',    label: 'Title Case',     hint: 'Headings (layout preserved)', value: this.titleCase(raw) },
      { key: 'sentence', label: 'Sentence case',  hint: 'Prose (layout preserved)',    value: this.sentenceCase(raw) },
      { key: 'upper',    label: 'UPPERCASE',      hint: 'Raw text, upper-cased',       value: raw.toUpperCase() },
      { key: 'lower',    label: 'lowercase',      hint: 'Raw text, lower-cased',       value: raw.toLowerCase() },
    ];
  }

  get wordCount(): number {
    return this.words(this.input).length;
  }

  copy(value: string, label: string): void {
    if (!value) return;
    this.utilityService.copyToClipboard(value, { label: `${label} copied` });
  }

  clear(): void {
    this.input = '';
  }
}
