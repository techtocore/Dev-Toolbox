import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'
@Component({
  selector: 'app-base64',
  templateUrl: './base64.component.html',
  styleUrls: ['./base64.component.scss']
})
export class Base64Component implements OnInit {

  toEncode: string = '';
  toDecode: string = '';
  isMobile;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  encode() {
    var encodedData = btoa(this.toEncode);
    this.toDecode = encodedData;
  }

  decode() {
    var decodedData = atob(this.toDecode);
    this.toEncode = decodedData;
  }

}
