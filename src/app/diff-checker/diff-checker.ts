import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
  lineNumber1?: number;
  lineNumber2?: number;
}

@Component({
  selector: 'app-diff-checker',
  standalone: false,
  templateUrl: './diff-checker.html',
  styleUrl: './diff-checker.scss',
})
export class DiffChecker implements OnInit {
  text1 = '';
  text2 = '';
  diffLines: DiffLine[] = [];
  addedCount = 0;
  removedCount = 0;
  unchangedCount = 0;
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  compareTexts() {
    if (!this.text1 && !this.text2) {
      this.diffLines = [];
      this.resetCounts();
      return;
    }

    const lines1 = this.text1.split('\n');
    const lines2 = this.text2.split('\n');

    this.diffLines = this.generateDiff(lines1, lines2);
    this.calculateStats();
  }

  generateDiff(lines1: string[], lines2: string[]): DiffLine[] {
    const diff: DiffLine[] = [];
    const lcs = this.longestCommonSubsequence(lines1, lines2);
    
    let i = 0, j = 0, k = 0;
    let lineNum1 = 1, lineNum2 = 1;

    while (i < lines1.length || j < lines2.length) {
      if (k < lcs.length && i < lines1.length && lines1[i] === lcs[k]) {
        // Line exists in both (unchanged)
        diff.push({
          type: 'same',
          content: lines1[i],
          lineNumber1: lineNum1,
          lineNumber2: lineNum2
        });
        i++;
        j++;
        k++;
        lineNum1++;
        lineNum2++;
      } else if (i < lines1.length && (k >= lcs.length || lines1[i] !== lcs[k])) {
        // Line removed from text1
        diff.push({
          type: 'removed',
          content: lines1[i],
          lineNumber1: lineNum1,
        });
        i++;
        lineNum1++;
      } else if (j < lines2.length) {
        // Line added in text2
        diff.push({
          type: 'added',
          content: lines2[j],
          lineNumber2: lineNum2
        });
        j++;
        lineNum2++;
      }
    }

    return diff;
  }

  longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Build LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  calculateStats() {
    this.addedCount = this.diffLines.filter(line => line.type === 'added').length;
    this.removedCount = this.diffLines.filter(line => line.type === 'removed').length;
    this.unchangedCount = this.diffLines.filter(line => line.type === 'same').length;
  }

  resetCounts() {
    this.addedCount = 0;
    this.removedCount = 0;
    this.unchangedCount = 0;
  }

  clear() {
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

    await this.utilityService.copyToClipboard(diffText);
  }
}
