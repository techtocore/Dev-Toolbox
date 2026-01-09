import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-url-encode',
  templateUrl: './url-encode.component.html',
  styleUrls: ['./url-encode.component.scss'],
  standalone: false
})

export class UrlEncodeComponent implements OnInit {

  context = {
    'title': 'URL Encoding / Decoding',
    'btn1': 'Encode',
    'btn2': 'Decode',
    'txt1': '',
    'txt2': '',
    'filename': 'urlEncode'
  }
  constructor() { }

  ngOnInit(): void {
  }

  encode(txt: string): void {
    const encodedData = encodeURIComponent(txt);
    this.context['txt2'] = encodedData;
  }

  decode(txt: string): void {
    const decodedData = decodeURIComponent(txt);
    this.context['txt1'] = decodedData;
  }

}
