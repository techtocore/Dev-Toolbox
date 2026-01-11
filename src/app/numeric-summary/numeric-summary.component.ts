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

      let arr: number[] = [];

      // Parse input - support comma or space separated
      if (this.inputTxt.includes(",")) {
        let str = this.inputTxt.replace(/\s/g, '');
        arr = str.split(",").map(Number);
      } else {
        arr = this.inputTxt.trim().split(/\s+/).map(Number);
      }

      // Remove NaN values
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

      // Median
      this.median = this.getPercentile(arr, 0.5);

      // Quartiles
      const lowerHalf = arr.filter(a => a < this.median);
      const upperHalf = arr.filter(a => a > this.median);
      this.q1 = this.getPercentile(lowerHalf.length > 0 ? lowerHalf : arr, 0.5);
      this.q3 = this.getPercentile(upperHalf.length > 0 ? upperHalf : arr, 0.5);
      this.iqr = this.q3 - this.q1;

      // Mode
      this.mode = this.getModes(arr);

      // Variance and Standard Deviation
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - this.mean, 2), 0) / (this.count - 1);
      this.variance = variance;
      this.stdDev = Math.sqrt(variance);

      const variancePop = arr.reduce((acc, val) => acc + Math.pow(val - this.mean, 2), 0) / this.count;
      this.stdDevPop = Math.sqrt(variancePop);

      // Coefficient of Variation
      this.coefficientOfVariation = (this.stdDev / Math.abs(this.mean)) * 100;

      // Skewness and Kurtosis (only if enough data)
      if (this.count >= 3) {
        this.skewness = this.calculateSkewness(arr, this.mean, this.stdDev);
      }
      if (this.count >= 4) {
        this.kurtosis = this.calculateKurtosis(arr, this.mean, this.stdDev);
      }

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
}
