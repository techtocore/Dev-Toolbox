import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-hash-generator',
  standalone: false,
  templateUrl: './hash-generator.html',
  styleUrl: './hash-generator.scss',
})
export class HashGenerator implements OnInit {
  inputText = '';
  md5Hash = '';
  sha1Hash = '';
  sha256Hash = '';
  sha512Hash = '';
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  generateHashes() {
    if (!this.inputText) {
      this.clearHashes();
      return;
    }

    this.md5Hash = CryptoJS.MD5(this.inputText).toString();
    this.sha1Hash = CryptoJS.SHA1(this.inputText).toString();
    this.sha256Hash = CryptoJS.SHA256(this.inputText).toString();
    this.sha512Hash = CryptoJS.SHA512(this.inputText).toString();
  }

  clearHashes() {
    this.md5Hash = '';
    this.sha1Hash = '';
    this.sha256Hash = '';
    this.sha512Hash = '';
  }

  clear() {
    this.inputText = '';
    this.clearHashes();
  }

  async copyToClipboard(text: string): Promise<void> {
    await this.utilityService.copyToClipboard(text);
  }
}
