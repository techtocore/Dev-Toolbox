import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'

@Component({
  selector: 'app-numeric-summary',
  templateUrl: './numeric-summary.component.html',
  styleUrls: ['./numeric-summary.component.scss']
})
export class NumericSummaryComponent implements OnInit {

  inputTxt: any;
  isMobile: boolean;
  count: number;
  mean: number;
  median: number;
  mode: any;
  sd: number;
  q1: number;
  min: number;
  q3: number;
  max: number;
  iqr: number;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  getPercentile(data, percentile) {
    let index = (percentile / 100) * data.length;
    let result;
    if (Math.floor(index) == index) {
      result = (data[(index - 1)] + data[index]) / 2;
    }
    else {
      result = data[Math.floor(index)];
    }
    return result;
  }

  getModes(array) {
    let frequency = [];
    let maxFreq = 0;
    let modes = [];

    for (let i in array) {
      frequency[array[i]] = (frequency[array[i]] || 0) + 1;

      if (frequency[array[i]] > maxFreq) {
        maxFreq = frequency[array[i]];
      }
    }

    for (let k in frequency) {
      if (frequency[k] == maxFreq) {
        modes.push(k);
      }
    }

    return modes;
  }

  getStandardDeviation (array) {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
  }

  process(): void {
    let arr = [];
    if (this.inputTxt.includes(",")) {
      let str = this.inputTxt.replace(/\s/g, '');
      arr = str.split(",").map(Number);
    } else {
      arr = this.inputTxt.split(" ").map(Number);
    }
    arr.sort();
    console.log(arr);
    this.count = arr.length;
    this.min = arr[0];
    this.max = arr[arr.length - 1];
    const average = (array) => array.reduce((a, b) => a + b) / array.length;
    this.mean = average(arr);
    this.q1 = this.getPercentile(arr, 25);
    this.median = this.getPercentile(arr, 50);
    this.q3 = this.getPercentile(arr, 75);
    this.iqr = 1.5 * (this.q3 - this.q1);
    this.mode = this.getModes(arr).join(", ");
    this.sd = this.getStandardDeviation(arr);
  }
}
