import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

type FieldKey = 'bin' | 'oct' | 'dec' | 'hex' | 'custom';

/**
 * Number Base Converter — cross-editable binary / octal / decimal / hex plus an
 * arbitrary base (2–36). Backed by BigInt, so arbitrarily large integers stay
 * exact. Editing any field instantly refreshes the others; underscores/spaces
 * and 0x/0o/0b prefixes are accepted as input.
 */
@Component({
  selector: 'app-base-converter',
  standalone: false,
  templateUrl: './base-converter.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './base-converter.scss',
})
export class BaseConverter implements OnInit {
  /** Canonical parsed value shared by every field (null = empty input). */
  value: bigint | null = 255n;
  error: string | null = null;
  uppercase = false;
  customBase = 32;
  isMobile = false;

  /** String models bound to each input. */
  f: Record<FieldKey, string> = { bin: '', oct: '', dec: '', hex: '', custom: '' };

  readonly customBases = Array.from({ length: 35 }, (_, i) => i + 2); // 2..36

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.syncAll();
  }

  private baseOf(field: FieldKey): number {
    switch (field) {
      case 'bin': return 2;
      case 'oct': return 8;
      case 'dec': return 10;
      case 'hex': return 16;
      case 'custom': return this.customBase;
    }
  }

  /** Handle a user edit in one field: parse it, then refresh the rest. */
  onEdit(field: FieldKey): void {
    const raw = this.f[field];
    if (raw.trim() === '') {
      this.value = null;
      this.error = null;
      this.syncExcept(field);
      return;
    }
    const parsed = this.parse(raw, this.baseOf(field));
    if (parsed === null) {
      this.error = `"${raw.trim()}" is not a valid base-${this.baseOf(field)} number.`;
      return; // keep the other fields untouched so the user can fix the typo
    }
    this.error = null;
    this.value = parsed;
    this.syncExcept(field);
  }

  onCustomBaseChange(): void {
    // Reformat only — the underlying value is unchanged.
    this.f.custom = this.format(this.customBase);
    if (this.value !== null) this.error = null;
  }

  applyCase(): void {
    // Presentation-only: re-render hex/custom in the chosen letter case.
    this.f.hex = this.format(16);
    this.f.custom = this.format(this.customBase);
  }

  private syncAll(): void {
    (['bin', 'oct', 'dec', 'hex', 'custom'] as FieldKey[]).forEach((k) => {
      this.f[k] = this.format(this.baseOf(k));
    });
  }

  private syncExcept(edited: FieldKey): void {
    (['bin', 'oct', 'dec', 'hex', 'custom'] as FieldKey[])
      .filter((k) => k !== edited)
      .forEach((k) => {
        this.f[k] = this.format(this.baseOf(k));
      });
  }

  /** Render the canonical value in `base`, honouring the uppercase toggle. */
  private format(base: number): string {
    if (this.value === null) return '';
    const s = this.value.toString(base);
    return this.uppercase ? s.toUpperCase() : s;
  }

  /** Parse `raw` as a base-`base` integer, or null when it is invalid. */
  private parse(raw: string, base: number): bigint | null {
    let s = raw.trim().toLowerCase().replace(/[_\s]/g, '');
    if (!s) return null;

    let negative = false;
    if (s[0] === '+') s = s.slice(1);
    else if (s[0] === '-') { negative = true; s = s.slice(1); }

    if (base === 16 && s.startsWith('0x')) s = s.slice(2);
    else if (base === 8 && s.startsWith('0o')) s = s.slice(2);
    else if (base === 2 && s.startsWith('0b')) s = s.slice(2);
    if (!s) return null;

    const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base);
    const bigBase = BigInt(base);
    let acc = 0n;
    for (const ch of s) {
      const idx = digits.indexOf(ch);
      if (idx < 0) return null;
      acc = acc * bigBase + BigInt(idx);
    }
    return negative ? -acc : acc;
  }

  // ---- Derived read-outs ----

  private get absValue(): bigint {
    if (this.value === null) return 0n;
    return this.value < 0n ? -this.value : this.value;
  }

  get bitLength(): number {
    const abs = this.absValue;
    return abs === 0n ? 0 : abs.toString(2).length;
  }

  get byteCount(): number {
    return Math.ceil(this.bitLength / 8);
  }

  get isNegative(): boolean {
    return this.value !== null && this.value < 0n;
  }

  /** Binary grouped into nibbles for readability, e.g. 1010 1101. */
  get groupedBinary(): string {
    if (this.value === null) return '';
    const bin = this.absValue.toString(2);
    const pad = (4 - (bin.length % 4)) % 4;
    const grouped = ('0'.repeat(pad) + bin).replace(/(.{4})/g, '$1 ').trim();
    return (this.isNegative ? '-' : '') + grouped;
  }

  get prefixed(): { label: string; value: string }[] {
    if (this.value === null) return [];
    const sign = this.isNegative ? '-' : '';
    const abs = this.absValue;
    const cx = (base: number) => {
      const s = abs.toString(base);
      return this.uppercase ? s.toUpperCase() : s;
    };
    return [
      { label: 'Hex', value: `${sign}0x${cx(16)}` },
      { label: 'Octal', value: `${sign}0o${cx(8)}` },
      { label: 'Binary', value: `${sign}0b${cx(2)}` },
    ];
  }

  copy(value: string, label: string): void {
    if (!value) return;
    this.utilityService.copyToClipboard(value, { label: `${label} copied` });
  }

  clear(): void {
    this.value = null;
    this.error = null;
    this.f = { bin: '', oct: '', dec: '', hex: '', custom: '' };
  }
}
