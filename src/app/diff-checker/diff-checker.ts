import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface WordSegment {
  text: string;
  kind: 'same' | 'added' | 'removed';
}

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
  segments?: WordSegment[]; // populated when paired with a similar opposite-type line
  lineNumber1?: number;
  lineNumber2?: number;
}

type ViewMode = 'unified' | 'side-by-side';

@Component({
  selector: 'app-diff-checker',
  standalone: false,
  templateUrl: './diff-checker.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './diff-checker.scss',
})
export class DiffChecker implements OnInit {
  text1 = '';
  text2 = '';
  diffLines: DiffLine[] = [];

  addedCount = 0;
  removedCount = 0;
  unchangedCount = 0;

  viewMode: ViewMode = 'unified';
  ignoreWhitespace = false;
  ignoreCase = false;

  /** Set when inputs exceed the live-diff size cap (avoids freezing the tab). */
  tooLarge = false;

  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  compareTexts(): void {
    if (!this.text1 && !this.text2) {
      this.diffLines = [];
      this.tooLarge = false;
      this.resetCounts();
      return;
    }

    const lines1 = this.text1.split('\n');
    const lines2 = this.text2.split('\n');

    // The LCS table is O(m*n) in both time and memory; on every keystroke a
    // very large pair would freeze the tab. Cap the line-count product.
    if (lines1.length * lines2.length > 4_000_000) {
      this.diffLines = [];
      this.resetCounts();
      this.tooLarge = true;
      return;
    }
    this.tooLarge = false;

    this.diffLines = this.generateDiff(lines1, lines2);
    this.attachWordSegments();
    this.calculateStats();
  }

  private generateDiff(lines1: string[], lines2: string[]): DiffLine[] {
    const norm = (s: string) =>
      this.ignoreCase ? s.toLowerCase() : s;
    const cmp = (a: string, b: string) =>
      this.ignoreWhitespace
        ? norm(a).replace(/\s+/g, ' ').trim() === norm(b).replace(/\s+/g, ' ').trim()
        : norm(a) === norm(b);

    const lcs = this.longestCommonSubsequence(lines1, lines2, cmp);
    const diff: DiffLine[] = [];

    let i = 0, j = 0, k = 0;
    let n1 = 1, n2 = 1;

    while (i < lines1.length || j < lines2.length) {
      const matchesLcsOnLeft  = k < lcs.length && i < lines1.length && cmp(lines1[i], lcs[k]);
      const matchesLcsOnRight = k < lcs.length && j < lines2.length && cmp(lines2[j], lcs[k]);

      if (matchesLcsOnLeft && matchesLcsOnRight) {
        // Both sides line up with the next LCS entry — it's an unchanged line.
        diff.push({ type: 'same', content: lines1[i], lineNumber1: n1, lineNumber2: n2 });
        i++; j++; k++; n1++; n2++;
      } else if (i < lines1.length && !matchesLcsOnLeft) {
        // Left side has a line that's not part of the LCS — it was removed.
        diff.push({ type: 'removed', content: lines1[i], lineNumber1: n1 });
        i++; n1++;
      } else if (j < lines2.length && !matchesLcsOnRight) {
        // Right side has a line that's not part of the LCS — it was added.
        diff.push({ type: 'added', content: lines2[j], lineNumber2: n2 });
        j++; n2++;
      } else {
        // Defensive: should be unreachable given a correct LCS, but break to
        // avoid an infinite loop if assumptions ever break.
        break;
      }
    }
    return diff;
  }

  private longestCommonSubsequence(
    arr1: string[],
    arr2: string[],
    cmp: (a: string, b: string) => boolean
  ): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (cmp(arr1[i - 1], arr2[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (cmp(arr1[i - 1], arr2[j - 1])) {
        lcs.unshift(arr1[i - 1]);
        i--; j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return lcs;
  }

  // Pair adjacent removed→added runs and compute inline word-level diff for each match.
  private attachWordSegments(): void {
    for (let i = 0; i < this.diffLines.length - 1; i++) {
      const cur = this.diffLines[i];
      const nxt = this.diffLines[i + 1];

      if (cur.type === 'removed' && nxt.type === 'added') {
        // Skip inline word-diff for very long lines: tokenizing + the O(tokA*tokB)
        // LCS DP would freeze the tab. The pair still renders as plain removed/added.
        if (cur.content.length > 2000 || nxt.content.length > 2000) continue;
        const sim = this.similarity(cur.content, nxt.content);
        if (sim > 0.3) {
          const { left, right } = this.wordDiff(cur.content, nxt.content);
          cur.segments = left;
          nxt.segments = right;
          i++; // skip the paired line
        }
      }
    }
  }

  private similarity(a: string, b: string): number {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    const ta = this.tokenize(a);
    const tb = this.tokenize(b);
    const setA = new Set(ta);
    const setB = new Set(tb);
    let intersection = 0;
    for (const x of setA) if (setB.has(x)) intersection++;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  private tokenize(s: string): string[] {
    return s.match(/\s+|[\w']+|[^\w\s]/g) || [];
  }

  private wordDiff(a: string, b: string): { left: WordSegment[]; right: WordSegment[] } {
    const tokA = this.tokenize(a);
    const tokB = this.tokenize(b);
    const lcs = this.longestCommonSubsequence(tokA, tokB, (x, y) => x === y);

    const left: WordSegment[] = [];
    const right: WordSegment[] = [];

    let i = 0, j = 0, k = 0;

    const pushLeft = (kind: WordSegment['kind'], text: string) => {
      const last = left[left.length - 1];
      if (last && last.kind === kind) last.text += text;
      else left.push({ text, kind });
    };
    const pushRight = (kind: WordSegment['kind'], text: string) => {
      const last = right[right.length - 1];
      if (last && last.kind === kind) last.text += text;
      else right.push({ text, kind });
    };

    while (i < tokA.length || j < tokB.length) {
      if (k < lcs.length && i < tokA.length && tokA[i] === lcs[k]
          && j < tokB.length && tokB[j] === lcs[k]) {
        pushLeft('same', tokA[i]);
        pushRight('same', tokB[j]);
        i++; j++; k++;
      } else if (i < tokA.length && (k >= lcs.length || tokA[i] !== lcs[k])) {
        pushLeft('removed', tokA[i]);
        i++;
      } else if (j < tokB.length) {
        pushRight('added', tokB[j]);
        j++;
      }
    }

    return { left, right };
  }

  // Build side-by-side rows: left = original, right = modified.
  get sideBySideRows(): { left?: DiffLine; right?: DiffLine }[] {
    const rows: { left?: DiffLine; right?: DiffLine }[] = [];
    for (let i = 0; i < this.diffLines.length; i++) {
      const line = this.diffLines[i];
      if (line.type === 'same') {
        rows.push({ left: line, right: line });
      } else if (line.type === 'removed') {
        const next = this.diffLines[i + 1];
        if (next && next.type === 'added') {
          rows.push({ left: line, right: next });
          i++;
        } else {
          rows.push({ left: line });
        }
      } else if (line.type === 'added') {
        rows.push({ right: line });
      }
    }
    return rows;
  }

  calculateStats(): void {
    this.addedCount = this.diffLines.filter(l => l.type === 'added').length;
    this.removedCount = this.diffLines.filter(l => l.type === 'removed').length;
    this.unchangedCount = this.diffLines.filter(l => l.type === 'same').length;
  }

  resetCounts(): void {
    this.addedCount = 0;
    this.removedCount = 0;
    this.unchangedCount = 0;
  }

  loadSample(): void {
    this.text1 = `function greet(name) {
  if (!name) {
    return "Hello, world!";
  }
  return "Hello, " + name + "!";
}

const user = "Akash";
console.log(greet(user));`;

    this.text2 = `function greet(name = "world") {
  const target = name || "world";
  return \`Hello, \${target}!\`;
}

const user = "Akash Ravi";
console.log(greet(user));
console.log(greet());`;
    this.compareTexts();
  }

  swap(): void {
    [this.text1, this.text2] = [this.text2, this.text1];
    this.compareTexts();
  }

  clear(): void {
    this.text1 = '';
    this.text2 = '';
    this.diffLines = [];
    this.resetCounts();
  }

  async copyDiff(): Promise<void> {
    const diffText = this.diffLines.map(line => {
      const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  ';
      return prefix + line.content;
    }).join('\n');

    await this.utilityService.copyToClipboard(diffText, { label: 'Diff copied' });
  }
}
