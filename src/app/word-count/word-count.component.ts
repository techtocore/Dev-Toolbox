import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'

@Component({
  selector: 'app-word-count',
  templateUrl: './word-count.component.html',
  styleUrls: ['./word-count.component.scss']
})
export class WordCountComponent implements OnInit {

  inputTxt: any;
  wordCount = 0;
  charCount = 0;
  charCountWithoutWS = 0;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
  }

  setCounts() {
    let txt = this.inputTxt.trim();
    this.wordCount = txt.split(' ').length;
    if (txt.length === 0) {
      this.wordCount = 0;
    }
    this.charCount = txt.length;

    let remText = txt.replace(/\s/g, '');
    this.charCountWithoutWS = remText.length;

  }
  
  saveAsFile() {
    this.utilityService.downloadFile(this.inputTxt, 'text/plain', 'inputText.txt');
  }

}
