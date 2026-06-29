import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

type UuidVersion = 'v4' | 'v7' | 'v1' | 'nil';

@Component({
  selector: 'app-uuid-generator',
  standalone: false,
  templateUrl: './uuid-generator.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './uuid-generator.scss',
})
export class UuidGenerator implements OnInit {
  uuids: string[] = [];
  count = 5;
  version: UuidVersion = 'v4';
  uppercase = false;
  isMobile = false;

  versions: { value: UuidVersion; label: string; hint: string }[] = [
    { value: 'v4', label: 'v4 (random)',          hint: '122-bit random — most common choice.' },
    { value: 'v7', label: 'v7 (Unix epoch)',       hint: 'Time-ordered, monotonic — great as a primary key.' },
    { value: 'v1', label: 'v1 (timestamp + node)', hint: 'Time-ordered using gregorian epoch + random node.' },
    { value: 'nil',label: 'nil',                   hint: 'All zeros — useful for tests / placeholders.' }
  ];

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.generate();
  }

  generate(): void {
    const clamped = Math.max(1, Math.min(this.count || 1, 1000));
    this.count = clamped;
    this.uuids = Array.from({ length: clamped }, () => this.generateOne());
  }

  private generateOne(): string {
    let id: string;
    switch (this.version) {
      case 'v4':  id = this.uuidV4(); break;
      case 'v7':  id = this.uuidV7(); break;
      case 'v1':  id = this.uuidV1(); break;
      case 'nil': id = '00000000-0000-0000-0000-000000000000'; break;
    }
    return this.uppercase ? id.toUpperCase() : id;
  }

  // RFC 4122 v4 — random.
  private uuidV4(): string {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const bytes = this.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    return this.formatUuid(bytes);
  }

  // Draft v7 — 48-bit Unix-ms timestamp + 74 bits of randomness, time-ordered.
  private uuidV7(): string {
    const bytes = this.randomBytes(16);
    const nowMs = BigInt(Date.now());
    bytes[0] = Number((nowMs >> 40n) & 0xffn);
    bytes[1] = Number((nowMs >> 32n) & 0xffn);
    bytes[2] = Number((nowMs >> 24n) & 0xffn);
    bytes[3] = Number((nowMs >> 16n) & 0xffn);
    bytes[4] = Number((nowMs >> 8n)  & 0xffn);
    bytes[5] = Number(nowMs & 0xffn);
    bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    return this.formatUuid(bytes);
  }

  // Simplified RFC 4122 v1 — timestamp + random clock-seq + random node.
  private uuidV1(): string {
    // 100-ns intervals since 1582-10-15.
    const gregorianOffsetMs = 12219292800000;
    const ts100ns = (BigInt(Date.now()) + BigInt(gregorianOffsetMs)) * 10000n;

    const timeLow  = Number(ts100ns & 0xffffffffn);
    const timeMid  = Number((ts100ns >> 32n) & 0xffffn);
    const timeHi   = Number((ts100ns >> 48n) & 0x0fffn) | 0x1000; // version 1

    const clockSeq = this.randomBytes(2);
    clockSeq[0] = (clockSeq[0] & 0x3f) | 0x80; // variant
    const node = this.randomBytes(6);
    node[0] |= 0x01; // multicast bit so we never collide with a real MAC

    const hex = (n: number, len: number) => n.toString(16).padStart(len, '0');
    const nodeHex = Array.from(node, b => b.toString(16).padStart(2, '0')).join('');
    const clockHex = Array.from(clockSeq, b => b.toString(16).padStart(2, '0')).join('');

    return `${hex(timeLow, 8)}-${hex(timeMid, 4)}-${hex(timeHi, 4)}-${clockHex}-${nodeHex}`;
  }

  private randomBytes(n: number): Uint8Array {
    const arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    return arr;
  }

  private formatUuid(bytes: Uint8Array): string {
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') + '-' +
      hex.slice(4, 6).join('') + '-' +
      hex.slice(6, 8).join('') + '-' +
      hex.slice(8, 10).join('') + '-' +
      hex.slice(10, 16).join('')
    );
  }

  async copyToClipboard(text: string): Promise<void> {
    await this.utilityService.copyToClipboard(text, { label: 'UUID copied' });
  }

  async copyAll(): Promise<void> {
    if (this.uuids.length === 0) return;
    await this.utilityService.copyToClipboard(this.uuids.join('\n'), {
      label: `${this.uuids.length} UUIDs copied`
    });
  }

  downloadAll(): void {
    if (this.uuids.length === 0) return;
    this.utilityService.downloadFile(this.uuids.join('\n'), 'text/plain', 'uuids.txt');
  }

  clear(): void {
    this.uuids = [];
  }

  get currentHint(): string {
    return this.versions.find(v => v.value === this.version)?.hint || '';
  }
}
