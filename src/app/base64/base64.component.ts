import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-base64',
  templateUrl: './base64.component.html',
  styleUrls: ['./base64.component.scss']
})

export class Base64Component implements OnInit {

  context = {
    'title': 'Base64 Encoding / Decoding',
    'btn1': 'Encode',
    'btn2': 'Decode',
    'txt1': '',
    'txt2': ''
  }
  constructor() { }

  ngOnInit(): void {
  }

  encode(txt) {
    var encodedData = btoa(txt);
    this.context['txt2'] = encodedData;
  }

  decode(txt) {
    var decodedData = atob(txt);
    this.context['txt1'] = decodedData;
  }

}
