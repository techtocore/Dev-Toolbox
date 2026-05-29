import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

type Mode = 'component' | 'full-url' | 'form';

interface QueryParam {
  key: string;
  value: string;
}

@Component({
  selector: 'app-url-encode',
  templateUrl: './url-encode.component.html',
  styleUrls: ['./url-encode.component.scss'],
  standalone: false
})
export class UrlEncodeComponent implements OnInit {
  decoded = '';
  encoded = '';

  mode: Mode = 'component';
  errorMessage = '';
  isMobile = false;

  // For full-URL mode
  parsed: {
    protocol?: string;
    host?: string;
    pathname?: string;
    hash?: string;
    params: QueryParam[];
  } | null = null;

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  setMode(m: Mode): void {
    this.mode = m;
    this.encode();
  }

  encode(): void {
    this.errorMessage = '';
    this.parsed = null;

    if (!this.decoded) {
      this.encoded = '';
      return;
    }

    try {
      switch (this.mode) {
        case 'component':
          this.encoded = encodeURIComponent(this.decoded);
          break;
        case 'full-url':
          this.encoded = encodeURI(this.decoded);
          // Parse for structured display.
          try {
            const url = new URL(this.decoded.includes('://') ? this.decoded : `https://${this.decoded}`);
            const params: QueryParam[] = [];
            url.searchParams.forEach((v, k) => params.push({ key: k, value: v }));
            this.parsed = {
              protocol: url.protocol,
              host: url.host,
              pathname: url.pathname,
              hash: url.hash,
              params
            };
          } catch {
            this.parsed = null;
          }
          break;
        case 'form':
          this.encoded = this.decoded
            .split(/\r\n|\r|\n/)
            .filter(line => line.trim() !== '')
            .map(line => {
              const eq = line.indexOf('=');
              if (eq < 0) return encodeURIComponent(line);
              const k = line.substring(0, eq);
              const v = line.substring(eq + 1);
              return `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%20/g, '+')}`;
            })
            .join('&');
          break;
      }
    } catch (e: any) {
      this.errorMessage = `Could not encode: ${e?.message || 'unknown error'}`;
      this.encoded = '';
    }
  }

  decode(): void {
    this.errorMessage = '';

    if (!this.encoded) {
      this.decoded = '';
      this.parsed = null;
      return;
    }

    try {
      switch (this.mode) {
        case 'component':
          this.decoded = decodeURIComponent(this.encoded);
          break;
        case 'full-url':
          this.decoded = decodeURI(this.encoded);
          break;
        case 'form':
          this.decoded = this.encoded
            .split('&')
            .filter(p => p)
            .map(p => {
              const eq = p.indexOf('=');
              if (eq < 0) return decodeURIComponent(p.replace(/\+/g, '%20'));
              const k = decodeURIComponent(p.substring(0, eq).replace(/\+/g, '%20'));
              const v = decodeURIComponent(p.substring(eq + 1).replace(/\+/g, '%20'));
              return `${k}=${v}`;
            })
            .join('\n');
          break;
      }
    } catch (e: any) {
      this.errorMessage = 'Invalid encoded input — check for stray percent signs or non-hex pairs.';
      this.decoded = '';
    }
  }

  loadSample(): void {
    switch (this.mode) {
      case 'component':
        this.decoded = 'name=Akash Ravi & co. (admin)';
        break;
      case 'full-url':
        this.decoded = 'https://dev-toolbox.example.com/tools/url-encode?q=hello world&lang=en&tags=a,b,c#fragment';
        break;
      case 'form':
        this.decoded = `name=Akash Ravi
email=akash@example.com
role=admin & owner
country=United States`;
        break;
    }
    this.encode();
  }

  swap(): void {
    [this.decoded, this.encoded] = [this.encoded, this.decoded];
    this.encode();
  }

  clear(): void {
    this.decoded = '';
    this.encoded = '';
    this.errorMessage = '';
    this.parsed = null;
  }

  copyEncoded(): void {
    if (!this.encoded) return;
    this.utilityService.copyToClipboard(this.encoded, { label: 'Encoded copied' });
  }

  copyDecoded(): void {
    if (!this.decoded) return;
    this.utilityService.copyToClipboard(this.decoded, { label: 'Decoded copied' });
  }
}
