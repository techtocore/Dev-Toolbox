import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-base64',
  templateUrl: './base64.component.html',
  styleUrls: ['./base64.component.scss'],
  standalone: false
})

export class Base64Component implements OnInit {

  context = {
    'title': 'Base64 Encoding / Decoding',
    'btn1': 'Encode',
    'btn2': 'Decode',
    'txt1': '',
    'txt2': '',
    'filename': 'base64',
    'error': ''
  }
  constructor() { }

  ngOnInit(): void {
  }

  encode(txt: string): void {
    try {
      // Handle Unicode characters by converting to UTF-8 first
      const encodedData = btoa(
        encodeURIComponent(txt).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode(parseInt(p1, 16));
        })
      );
      this.context['txt2'] = encodedData;
      this.context['error'] = '';
    } catch (error) {
      this.context['error'] = 'Error encoding to Base64. Please check your input.';
      this.context['txt2'] = '';
    }
  }

  decode(txt: string): void {
    try {
      // Handle Unicode characters by decoding from UTF-8
      const decodedData = decodeURIComponent(
        Array.prototype.map.call(atob(txt), (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      this.context['txt1'] = decodedData;
      this.context['error'] = '';
    } catch (error) {
      this.context['error'] = 'Error decoding from Base64. Invalid Base64 string.';
      this.context['txt1'] = '';
    }
  }

}
