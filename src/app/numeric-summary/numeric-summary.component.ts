import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'

@Component({
  selector: 'app-numeric-summary',
  templateUrl: './numeric-summary.component.html',
  styleUrls: ['./numeric-summary.component.scss'],
  standalone: false
})
export class NumericSummaryComponent implements OnInit {

  inputTxt: string = '';
  isMobile: boolean = false;

  // Basic stats
  count: number = 0;
  sum: number = 0;
  mean: number = 0;
  median: number = 0;
  mode: string = '';

  // Spread measures
  min: number = 0;
  max: number = 0;
  range: number = 0;
  variance: number = 0;
  stdDev: number = 0;
  stdDevPop: number = 0;
  coefficientOfVariation: number = 0;

  // Quartiles
  q1: number = 0;
  q3: number = 0;
  iqr: number = 0;

  // Additional metrics
  skewness: number = 0;
  kurtosis: number = 0;

  // Outliers
  outlierCount: number = 0;
  outliers: number[] = [];

  errorMessage: string = '';
  hasResults: boolean = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  getPercentile(data: number[], percentile: number): number {
    const pos = ((data.length) - 1) * percentile;
    const base = Math.floor(pos);
    const rest = pos - base;
    if ((data[base + 1] !== undefined)) {
      return data[base] + rest * (data[base + 1] - data[base]);
    } else {
      return data[base];
    }
  }

  getModes(array: number[]): string {
    const frequency: { [key: number]: number } = {};
    let maxFreq = 0;
    const modes: number[] = [];

    array.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
      }
    });

    for (let k in frequency) {
      if (frequency[k] === maxFreq) {
        modes.push(Number(k));
      }
    }

    if (modes.length === array.length) {
      return 'No mode (all values unique)';
    }

    if (maxFreq === 1) {
      return 'No mode (all values unique)';
    }

    return modes.join(', ');
  }

  calculateSkewness(arr: number[], mean: number, stdDev: number): number {
    const n = arr.length;
    const sumCubed = arr.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0);
    return (n * sumCubed) / ((n - 1) * (n - 2));
  }

  calculateKurtosis(arr: number[], mean: number, stdDev: number): number {
    const n = arr.length;
    const sumFourth = arr.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0);
    return ((n * (n + 1) * sumFourth) / ((n - 1) * (n - 2) * (n - 3))) -
           ((3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3)));
  }

  findOutliers(arr: number[], q1: number, q3: number, iqr: number): number[] {
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    return arr.filter(val => val < lowerBound || val > upperBound);
  }

  process(): void {
    this.errorMessage = '';
    this.hasResults = false;

    try {
      if (!this.inputTxt || !this.inputTxt.trim()) {
        throw new Error('Please enter numeric data');
      }

      // Parse input — treat any run of commas and/or whitespace (spaces, tabs,
      // newlines) as a single delimiter, so mixed separators across lines work.
      let arr: number[] = this.inputTxt.trim().split(/[\s,]+/).map(Number);

      // Remove NaN values (also drops any stray empty token).
      arr = arr.filter(n => !isNaN(n));

      if (arr.length === 0) {
        throw new Error('No valid numeric data found');
      }

      if (arr.length < 2) {
        throw new Error('Please enter at least 2 numbers');
      }

      arr.sort((a, b) => a - b);

      // Basic stats
      this.count = arr.length;
      this.sum = arr.reduce((a, b) => a + b, 0);
      this.mean = this.sum / this.count;
      this.min = arr[0];
      this.max = arr[arr.length - 1];
      this.range = this.max - this.min;

      // Median, Q1, Q3 — use type-7 linear interpolation directly (matches
      // NumPy `np.percentile`, R default, Excel QUARTILE.INC). The previous
      // half-split-around-median approach gave degenerate results for small
      // arrays like [1, 2, 3] (Q1 became min, Q3 became max).
      this.median = this.getPercentile(arr, 0.5);
      this.q1 = this.getPercentile(arr, 0.25);
      this.q3 = this.getPercentile(arr, 0.75);
      this.iqr = this.q3 - this.q1;

      // Mode
      this.mode = this.getModes(arr);

      // Variance and Standard Deviation
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - this.mean, 2), 0) / (this.count - 1);
      this.variance = variance;
      this.stdDev = Math.sqrt(variance);

      const variancePop = arr.reduce((acc, val) => acc + Math.pow(val - this.mean, 2), 0) / this.count;
      this.stdDevPop = Math.sqrt(variancePop);

      // Coefficient of Variation — undefined when mean is 0 (avoids NaN in UI).
      this.coefficientOfVariation = this.mean === 0
        ? 0
        : (this.stdDev / Math.abs(this.mean)) * 100;

      // Skewness and Kurtosis are undefined without variation — guard the
      // zero-stdDev case so constant data yields N/A rather than NaN, and reset
      // explicitly so a prior run's value never lingers (these are instance state).
      this.skewness = (this.count >= 3 && this.stdDev > 0)
        ? this.calculateSkewness(arr, this.mean, this.stdDev)
        : NaN;
      this.kurtosis = (this.count >= 4 && this.stdDev > 0)
        ? this.calculateKurtosis(arr, this.mean, this.stdDev)
        : NaN;

      // Outliers
      this.outliers = this.findOutliers(arr, this.q1, this.q3, this.iqr);
      this.outlierCount = this.outliers.length;

      this.hasResults = true;

    } catch (error: any) {
      this.errorMessage = error.message || 'Calculation failed';
      this.hasResults = false;
    }
  }

  loadSample(): void {
    this.inputTxt = '12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 55';
    this.process();
  }

  clearAll(): void {
    this.inputTxt = '';
    this.hasResults = false;
    this.errorMessage = '';
  }

  formatNumber(num: number, decimals: number = 2): string {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    return num.toFixed(decimals);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.inputTxt = await file.text();
    input.value = '';
    this.process();
  }

  async onFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    this.inputTxt = await file.text();
    this.process();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private currentStats(): { key: string; label: string; value: number | string }[] {
    return [
      { key: 'count', label: 'Count', value: this.count },
      { key: 'sum', label: 'Sum', value: this.sum },
      { key: 'mean', label: 'Mean', value: this.mean },
      { key: 'median', label: 'Median', value: this.median },
      { key: 'mode', label: 'Mode', value: this.mode },
      { key: 'min', label: 'Min', value: this.min },
      { key: 'max', label: 'Max', value: this.max },
      { key: 'range', label: 'Range', value: this.range },
      { key: 'q1', label: 'Q1', value: this.q1 },
      { key: 'q3', label: 'Q3', value: this.q3 },
      { key: 'iqr', label: 'IQR', value: this.iqr },
      { key: 'variance', label: 'Variance (sample)', value: this.variance },
      { key: 'stdDev', label: 'Std Dev (sample)', value: this.stdDev },
      { key: 'stdDevPop', label: 'Std Dev (population)', value: this.stdDevPop },
      { key: 'cv', label: 'Coefficient of variation %', value: this.coefficientOfVariation },
      { key: 'skewness', label: 'Skewness', value: this.skewness },
      { key: 'kurtosis', label: 'Excess kurtosis', value: this.kurtosis },
      { key: 'outliers', label: 'Outlier count', value: this.outlierCount },
    ];
  }

  exportJson(): void {
    if (!this.hasResults) return;
    const payload = {
      stats: this.currentStats().reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, any>),
      outliers: this.outliers,
      generatedAt: new Date().toISOString()
    };
    this.utilityService.downloadFile(JSON.stringify(payload, null, 2), 'application/json', 'stats.json');
  }

  exportCsv(): void {
    if (!this.hasResults) return;
    const rows = this.currentStats().map(s => `${s.label},${s.value}`);
    rows.push(`Outliers,"${this.outliers.join(', ')}"`);
    this.utilityService.downloadFile('Statistic,Value\n' + rows.join('\n'), 'text/csv', 'stats.csv');
  }
}
