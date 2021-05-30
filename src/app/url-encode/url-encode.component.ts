import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'
@Component({
  selector: 'app-url-encode',
  templateUrl: './url-encode.component.html',
  styleUrls: ['./url-encode.component.scss']
})
export class UrlEncodeComponent implements OnInit {

  toEncode: string = '';
  toDecode: string = '';
  isMobile;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  encode() {
    var encodedData = encodeURIComponent(this.toEncode);
    this.toDecode = encodedData;
  }

  decode() {
    var decodedData = decodeURIComponent(this.toDecode);
    this.toEncode = decodedData;
  }

}
