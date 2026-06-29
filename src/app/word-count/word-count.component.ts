import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface Stat {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'success' | 'info' | 'warning' | 'secondary';
}

@Component({
  selector: 'app-word-count',
  templateUrl: './word-count.component.html',
  styleUrls: ['./word-count.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class WordCountComponent implements OnInit {
  inputTxt: string = '';

  // Counts
  wordCount = 0;
  charCount = 0;
  charCountWithoutWS = 0;
  sentenceCount = 0;
  paragraphCount = 0;
  lineCount = 0;
  uniqueWordCount = 0;
  longestWord = '';
  averageWordLength = 0;
  readingTimeSec = 0;
  speakingTimeSec = 0;

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {}

  setCounts(): void {
    const txt = this.inputTxt || '';
    const trimmed = txt.trim();

    // Count by Unicode code point (spread iterates code points), so emoji and
    // other astral characters count as one, not two UTF-16 code units.
    this.charCount = [...txt].length;
    this.charCountWithoutWS = [...txt.replace(/\s/g, '')].length;
    this.lineCount = txt === '' ? 0 : txt.split(/\r\n|\r|\n/).length;
    this.paragraphCount = trimmed === '' ? 0 : trimmed.split(/\n\s*\n+/).filter(p => p.trim().length > 0).length;
    this.sentenceCount = trimmed === '' ? 0 : this.countSentences(trimmed);

    const wordTokens: string[] = trimmed === ''
      ? []
      : (trimmed.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) as string[] | null) ?? [];
    // Measure word length by code point (spread iterates code points) so astral
    // letters/emoji count as one, consistent with charCount.
    const cpLen = (w: string) => [...w].length;
    this.wordCount = wordTokens.length;
    this.uniqueWordCount = new Set(wordTokens.map(w => w.toLowerCase())).size;
    this.longestWord = wordTokens.reduce(
      (longest, w) => (cpLen(w) > cpLen(longest) ? w : longest),
      ''
    );
    this.averageWordLength = this.wordCount > 0
      ? Math.round((wordTokens.reduce((s, w) => s + cpLen(w), 0) / this.wordCount) * 10) / 10
      : 0;

    // 238 wpm ≈ average silent reading speed; 150 wpm ≈ public speaking pace.
    this.readingTimeSec = Math.round((this.wordCount / 238) * 60);
    this.speakingTimeSec = Math.round((this.wordCount / 150) * 60);
  }

  /**
   * Counts sentences as runs ending in .!? (with optional closing quote/bracket),
   * plus one final sentence if trailing text carries word characters but no
   * terminating punctuation (e.g. "hello world" → 1).
   */
  private countSentences(trimmed: string): number {
    const re = /[^.!?]+[.!?]+(?:["')\]]+)?/g;
    let count = 0;
    let lastEnd = 0;
    while (re.exec(trimmed) !== null) {
      count++;
      lastEnd = re.lastIndex;
    }
    if (/[\p{L}\p{N}]/u.test(trimmed.slice(lastEnd))) count++;
    return count;
  }

  loadSample(): void {
    this.inputTxt = `The Quick Brown Fox

The quick brown fox jumps over the lazy dog. This sentence is famous for using every letter in the English alphabet at least once, making it a popular pangram for testing fonts, keyboards, and typesetting.

Pangrams have been used since the days of telegraphs to test transmission equipment. Today they remain handy for any tool that needs to display character glyphs side by side.

Try editing this paragraph — all stats update live as you type.`;
    this.setCounts();
  }

  clear(): void {
    this.inputTxt = '';
    this.setCounts();
  }

  saveAsFile(): void {
    this.utilityService.downloadFile(this.inputTxt || '', 'text/plain', 'inputText.txt');
  }

  formatTime(seconds: number): string {
    if (seconds < 1) return '< 1 sec';
    if (seconds < 60) return `${seconds} sec`;
    const minutes = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    if (minutes < 60) return remSec ? `${minutes} min ${remSec} sec` : `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return remMin ? `${hours} h ${remMin} min` : `${hours} h`;
  }

  get stats(): Stat[] {
    return [
      { label: 'Words',            value: this.wordCount.toLocaleString(),         icon: 'bi-textarea-t',        tone: 'primary' },
      { label: 'Characters',       value: this.charCount.toLocaleString(),         icon: 'bi-type',              tone: 'primary' },
      { label: 'No whitespace',    value: this.charCountWithoutWS.toLocaleString(),icon: 'bi-type-strikethrough',tone: 'secondary' },
      { label: 'Sentences',        value: this.sentenceCount.toLocaleString(),     icon: 'bi-chat-quote',        tone: 'info' },
      { label: 'Paragraphs',       value: this.paragraphCount.toLocaleString(),    icon: 'bi-paragraph',         tone: 'info' },
      { label: 'Lines',            value: this.lineCount.toLocaleString(),         icon: 'bi-list-ol',           tone: 'secondary' },
      { label: 'Unique words',     value: this.uniqueWordCount.toLocaleString(),   icon: 'bi-fingerprint',       tone: 'success' },
      { label: 'Avg word length',  value: this.averageWordLength.toString(),       icon: 'bi-rulers',            tone: 'success' },
      { label: 'Longest word',     value: this.longestWord || '—',                 icon: 'bi-arrows-expand-vertical', tone: 'warning' },
      { label: 'Reading time',     value: this.formatTime(this.readingTimeSec),    icon: 'bi-book',              tone: 'warning' },
      { label: 'Speaking time',    value: this.formatTime(this.speakingTimeSec),   icon: 'bi-mic',               tone: 'warning' },
    ];
  }
}
