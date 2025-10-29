import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

@Component({
  selector: 'app-jwt-decoder',
  standalone: false,
  templateUrl: './jwt-decoder.html',
  styleUrl: './jwt-decoder.scss',
})
export class JwtDecoder implements OnInit {
  jwtInput = '';
  header = '';
  payload = '';
  signature = '';
  isValid = false;
  errorMessage = '';
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  decodeJwt() {
    if (!this.jwtInput || this.jwtInput.trim() === '') {
      this.clearOutputs();
      return;
    }

    try {
      const parts = this.jwtInput.trim().split('.');
      
      if (parts.length !== 3) {
        this.errorMessage = 'Invalid JWT format. JWT must have 3 parts separated by dots.';
        this.isValid = false;
        this.clearOutputs();
        return;
      }

      // Decode header
      try {
        this.header = this.base64UrlDecode(parts[0]);
        const headerObj = JSON.parse(this.header);
        this.header = JSON.stringify(headerObj, null, 2);
      } catch {
        this.errorMessage = 'Failed to decode JWT header';
        this.isValid = false;
        this.clearOutputs();
        return;
      }

      // Decode payload
      try {
        this.payload = this.base64UrlDecode(parts[1]);
        const payloadObj = JSON.parse(this.payload);
        this.payload = JSON.stringify(payloadObj, null, 2);
      } catch {
        this.errorMessage = 'Failed to decode JWT payload';
        this.isValid = false;
        this.clearOutputs();
        return;
      }

      // Signature
      this.signature = parts[2];
      this.isValid = true;
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage = 'Invalid JWT token';
      this.isValid = false;
      this.clearOutputs();
    }
  }

  base64UrlDecode(str: string): string {
    // Replace URL-safe characters
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Pad with = to make length multiple of 4
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    // Decode base64
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  }

  clear() {
    this.jwtInput = '';
    this.clearOutputs();
  }

  clearOutputs() {
    this.header = '';
    this.payload = '';
    this.signature = '';
    this.isValid = false;
    this.errorMessage = '';
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
}
