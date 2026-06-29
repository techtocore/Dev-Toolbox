import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface ClaimRow {
  key: string;
  raw: any;
  display: string;
  description: string;
  tone?: 'normal' | 'warning' | 'danger' | 'success';
}

const STANDARD_CLAIMS: Record<string, string> = {
  iss: 'Issuer — who created and signed this token.',
  sub: 'Subject — who the token is about (typically a user ID).',
  aud: 'Audience — the recipient(s) the token is intended for.',
  exp: 'Expiration time — token is invalid after this instant.',
  nbf: 'Not before — token is invalid before this instant.',
  iat: 'Issued at — when the token was created.',
  jti: 'JWT ID — unique identifier (often used to prevent replay).',
  azp: 'Authorized party — OIDC client the token was issued to.',
  scope: 'Granted scopes (space-delimited).',
  scp: 'Granted scopes (array).',
  email: 'User email.',
  email_verified: 'Whether the email has been verified.',
  name: 'Full display name.',
  given_name: 'Given (first) name.',
  family_name: 'Family (last) name.',
  preferred_username: 'Username the user prefers.',
  roles: 'Roles assigned to the subject.',
  groups: 'Groups the subject belongs to.',
};

@Component({
  selector: 'app-jwt-decoder',
  standalone: false,
  templateUrl: './jwt-decoder.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './jwt-decoder.scss',
})
export class JwtDecoder implements OnInit {
  jwtInput = '';
  headerJson = '';
  payloadJson = '';
  signature = '';
  isValid = false;
  errorMessage = '';
  isMobile = false;

  payloadObj: Record<string, any> = {};
  headerObj: Record<string, any> = {};

  expiryStatus: 'valid' | 'expired' | 'not-yet-valid' | 'no-exp' = 'no-exp';
  expiryMessage = '';
  expiryColor: 'success' | 'danger' | 'warning' | 'secondary' = 'secondary';

  claims: ClaimRow[] = [];

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  decodeJwt(): void {
    if (!this.jwtInput || this.jwtInput.trim() === '') {
      this.clearOutputs();
      return;
    }

    const parts = this.jwtInput.trim().split('.');

    if (parts.length !== 3) {
      this.errorMessage = `Invalid JWT format — expected 3 parts separated by dots, got ${parts.length}.`;
      this.isValid = false;
      this.clearOutputs(true);
      return;
    }

    try {
      this.headerObj = JSON.parse(this.base64UrlDecode(parts[0]));
      this.headerJson = JSON.stringify(this.headerObj, null, 2);
    } catch {
      this.errorMessage = 'Failed to decode JWT header — invalid base64url or JSON.';
      this.isValid = false;
      this.clearOutputs(true);
      return;
    }
    if (!this.isPlainObject(this.headerObj)) {
      this.errorMessage = 'JWT header is not a JSON object.';
      this.isValid = false;
      this.clearOutputs(true);
      return;
    }

    try {
      this.payloadObj = JSON.parse(this.base64UrlDecode(parts[1]));
      this.payloadJson = JSON.stringify(this.payloadObj, null, 2);
    } catch {
      this.errorMessage = 'Failed to decode JWT payload — invalid base64url or JSON.';
      this.isValid = false;
      this.clearOutputs(true);
      return;
    }
    if (!this.isPlainObject(this.payloadObj)) {
      this.errorMessage = 'JWT payload is not a JSON object.';
      this.isValid = false;
      this.clearOutputs(true);
      return;
    }

    this.signature = parts[2];
    this.isValid = true;
    this.errorMessage = '';

    this.computeExpiry();
    this.buildClaimRows();
  }

  /** True only for a non-null, non-array plain object (a valid JWT segment). */
  private isPlainObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Coerces a NumericDate-style claim (number or numeric string) to epoch
   * seconds, returning undefined for anything non-finite. Values beyond
   * ~year 5138 in seconds are almost certainly milliseconds, so they are
   * normalized down — avoids a stray ms `exp` reading as a 56,000-year token.
   */
  private toEpochSeconds(value: unknown): number | undefined {
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim() !== ''
          ? Number(value)
          : NaN;
    if (!Number.isFinite(n)) return undefined;
    return n > 1e11 ? Math.floor(n / 1000) : n;
  }

  private computeExpiry(): void {
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = this.toEpochSeconds(this.payloadObj.exp);
    const nbf = this.toEpochSeconds(this.payloadObj.nbf);

    if (nbf != null && nowSec < nbf) {
      this.expiryStatus = 'not-yet-valid';
      this.expiryColor = 'warning';
      this.expiryMessage = `Not valid until ${this.formatTime(nbf)} (in ${this.formatDuration(nbf - nowSec)}).`;
      return;
    }

    if (exp == null) {
      this.expiryStatus = 'no-exp';
      this.expiryColor = 'secondary';
      this.expiryMessage = 'No `exp` claim — this token never expires (unusual).';
      return;
    }

    if (nowSec >= exp) {
      this.expiryStatus = 'expired';
      this.expiryColor = 'danger';
      this.expiryMessage = `Expired ${this.formatDuration(nowSec - exp)} ago (at ${this.formatTime(exp)}).`;
    } else {
      this.expiryStatus = 'valid';
      this.expiryColor = 'success';
      this.expiryMessage = `Valid for another ${this.formatDuration(exp - nowSec)} (until ${this.formatTime(exp)}).`;
    }
  }

  private buildClaimRows(): void {
    const rows: ClaimRow[] = [];
    const timeClaims = new Set(['exp', 'nbf', 'iat', 'auth_time']);

    for (const [key, value] of Object.entries(this.payloadObj)) {
      let display: string;
      let tone: ClaimRow['tone'] = 'normal';

      const epochSec = timeClaims.has(key) ? this.toEpochSeconds(value) : undefined;
      if (epochSec !== undefined) {
        display = `${value}  →  ${this.formatTime(epochSec)}`;
        if (key === 'exp') {
          tone = this.expiryStatus === 'expired' ? 'danger'
            : this.expiryStatus === 'not-yet-valid' ? 'warning'
            : 'success';
        }
      } else if (typeof value === 'object' && value !== null) {
        display = JSON.stringify(value);
      } else {
        display = String(value);
      }

      rows.push({
        key,
        raw: value,
        display,
        description: STANDARD_CLAIMS[key] || 'Custom claim.',
        tone
      });
    }

    this.claims = rows;
  }

  private formatTime(unixSec: number): string {
    return new Date(unixSec * 1000).toLocaleString();
  }

  private formatDuration(seconds: number): string {
    const abs = Math.abs(seconds);
    if (abs < 60) return `${Math.floor(abs)}s`;
    if (abs < 3600) return `${Math.floor(abs / 60)}m ${Math.floor(abs % 60)}s`;
    if (abs < 86400) return `${Math.floor(abs / 3600)}h ${Math.floor((abs % 3600) / 60)}m`;
    return `${Math.floor(abs / 86400)}d ${Math.floor((abs % 86400) / 3600)}h`;
  }

  base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  }

  loadSample(): void {
    // RFC 7519 sample-style: standard claims with a near-future exp.
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const iat = Math.floor(Date.now() / 1000) - 60;
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: 'https://accounts.dev-toolbox.io',
      sub: 'user_8f3a2c',
      aud: 'dev-toolbox-app',
      name: 'Akash Ravi',
      email: 'akash@example.com',
      email_verified: true,
      roles: ['admin', 'user'],
      iat,
      exp,
      jti: '550e8400-e29b-41d4-a716-446655440000'
    };
    const enc = (obj: any) => this.base64UrlEncode(JSON.stringify(obj));
    this.jwtInput = `${enc(header)}.${enc(payload)}.signature-not-verifiable-in-browser`;
    this.decodeJwt();
  }

  private base64UrlEncode(str: string): string {
    return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  clear(): void {
    this.jwtInput = '';
    this.clearOutputs();
  }

  private clearOutputs(keepError = false): void {
    this.headerJson = '';
    this.payloadJson = '';
    this.signature = '';
    this.isValid = false;
    this.claims = [];
    this.headerObj = {};
    this.payloadObj = {};
    this.expiryStatus = 'no-exp';
    this.expiryMessage = '';
    this.expiryColor = 'secondary';
    if (!keepError) this.errorMessage = '';
  }

  copyHeader(): void {
    this.utilityService.copyToClipboard(this.headerJson, { label: 'Header copied' });
  }
  copyPayload(): void {
    this.utilityService.copyToClipboard(this.payloadJson, { label: 'Payload copied' });
  }
  copySignature(): void {
    this.utilityService.copyToClipboard(this.signature, { label: 'Signature copied' });
  }
}
