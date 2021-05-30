import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'

@Component({
  selector: 'app-json-formatter',
  templateUrl: './json-formatter.component.html',
  styleUrls: ['./json-formatter.component.scss']
})
export class JsonFormatterComponent implements OnInit {


  toEncode: string = '';
  toDecode: any = {};
  isMobile;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  encode() {
    try {
      var encodedData = JSON.parse(this.toEncode.trim());
      this.toDecode = encodedData;
    } catch {
      this.toDecode = 'Error parsing JSON';
    }
  }

}
