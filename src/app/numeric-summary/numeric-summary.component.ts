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
  sd1: number;
  sd2: number;
  q1: number;
  min: number;
  q3: number;
  max: number;
  iqr: number;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  get50Percentile(data) {
    var pos = ((data.length) - 1) * 0.5;
    var base = Math.floor(pos);
    var rest = pos - base;
    if ((data[base + 1] !== undefined)) {
      return data[base] + rest * (data[base + 1] - data[base]);
    } else {
      return data[base];
    }
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

    if (modes.length === array.length) {
      return ['All elements have the same frequency of ' + maxFreq];
    }

    return modes;
  }

  process(): void {
    let arr = [];
    if (this.inputTxt.includes(",")) {
      let str = this.inputTxt.replace(/\s/g, '');
      arr = str.split(",").map(Number);
    } else {
      arr = this.inputTxt.split(" ").map(Number);
    }
    arr.sort((a, b) => a - b);
    console.log(arr);

    const average = (array) => array.reduce((a, b) => a + b) / array.length;
    const standardDeviation = (arr, usePopulation = false) => {
      const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
      return Math.sqrt(
        arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /
        (arr.length - (usePopulation ? 0 : 1))
      );
    };

    this.count = arr.length;
    this.min = arr[0];
    this.max = arr[arr.length - 1];
    this.mean = average(arr);
    this.median = this.get50Percentile(arr);
    let arr1 = arr.filter(a => a < this.median);
    this.q1 = this.get50Percentile(arr1);
    let arr3 = arr.filter(a => a > this.median);
    this.q3 = this.get50Percentile(arr3);
    this.iqr = this.q3 - this.q1;
    this.mode = this.getModes(arr).join(", ");
    this.sd1 = standardDeviation(arr);
    this.sd2 = standardDeviation(arr, true);
  }
}
