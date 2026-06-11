import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface OutputRow {
  key: string;
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-timestamp-converter',
  standalone: false,
  templateUrl: './timestamp-converter.html',
  styleUrl: './timestamp-converter.scss',
})
export class TimestampConverter implements OnInit {
  unixInput = '';
  dateTimeInput = '';
  isoInput = '';

  selectedTz: string = Intl.DateTimeFormat().resolvedOptions().timeZone;

  hasValidInput = false;
  isMobile = false;

  // Output rows shown to the user.
  outputs: OutputRow[] = [];
  outputDate: Date | null = null;

  // Curated common timezones — keeps the dropdown manageable.
  timezones: string[] = [
    'UTC',
    'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
    'America/Sao_Paulo',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
    'Africa/Cairo', 'Africa/Johannesburg',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    if (!this.timezones.includes(this.selectedTz)) {
      this.timezones.unshift(this.selectedTz);
    }
  }

  onUnixInputChange(): void {
    if (!this.unixInput.trim()) return this.clearOutputs();
    const num = Number(this.unixInput.trim());
    if (Number.isNaN(num)) return this.clearOutputs();
    // Detect by magnitude rather than digit count: a 10-digit ms value falls
    // in early 1970, which would be misclassified as seconds by the length
    // heuristic. Anything below 10^11 (year ~5138 as a seconds value, but
    // only year 1973 as ms) we treat as seconds.
    const abs = Math.abs(num);
    const ms = abs < 1e11 ? num * 1000 : num;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return this.clearOutputs();
    this.updateFromDate(date, 'unix');
  }

  onDateTimeChange(): void {
    if (!this.dateTimeInput.trim()) return this.clearOutputs();
    const date = new Date(this.dateTimeInput);
    if (Number.isNaN(date.getTime())) return this.clearOutputs();
    this.updateFromDate(date, 'datetime');
  }

  onIsoInputChange(): void {
    if (!this.isoInput.trim()) return this.clearOutputs();
    const date = new Date(this.isoInput.trim());
    if (Number.isNaN(date.getTime())) return this.clearOutputs();
    this.updateFromDate(date, 'iso');
  }

  onTzChange(): void {
    if (this.outputDate) this.updateFromDate(this.outputDate, 'tz');
  }

  useCurrentTimestamp(): void {
    this.updateFromDate(new Date(), 'unix');
  }

  private updateFromDate(date: Date, source: 'unix' | 'datetime' | 'iso' | 'tz'): void {
    this.hasValidInput = true;
    this.outputDate = date;

    const unixSec = Math.floor(date.getTime() / 1000);
    const unixMs = date.getTime();

    // Local datetime-local input always in user's local zone (HTML5 limitation).
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const dateTimeLocal = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;

    if (source !== 'datetime') this.dateTimeInput = dateTimeLocal;
    if (source !== 'unix')     this.unixInput = String(unixSec);
    if (source !== 'iso')      this.isoInput = date.toISOString();

    const tzOpts: Intl.DateTimeFormatOptions = {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: this.selectedTz, timeZoneName: 'short'
    };
    const utcOpts: Intl.DateTimeFormatOptions = {
      ...tzOpts, timeZone: 'UTC'
    };

    // Day of year and ISO week, resolved in the SELECTED timezone so they stay
    // consistent with the "Day of week" row (which already uses selectedTz).
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.selectedTz, year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(date);
    const part = (t: string) => Number(parts.find(p => p.type === t)?.value);
    const tzYear = part('year');
    const tzMonth = part('month');
    const tzDay = part('day');
    const dayOfYear = Math.floor(
      (Date.UTC(tzYear, tzMonth - 1, tzDay) - Date.UTC(tzYear, 0, 0)) / 86400000,
    );
    const weekOfYear = this.getISOWeek(tzYear, tzMonth, tzDay);

    this.outputs = [
      { key: 'unixSec',  label: 'Unix (seconds)',     value: String(unixSec), icon: 'bi-clock' },
      { key: 'unixMs',   label: 'Unix (milliseconds)',value: String(unixMs),  icon: 'bi-clock' },
      { key: 'iso',      label: 'ISO 8601 (UTC)',     value: date.toISOString(), icon: 'bi-code-slash' },
      { key: 'tz',       label: `In ${this.selectedTz}`, value: date.toLocaleString('en-US', tzOpts), icon: 'bi-geo-alt' },
      { key: 'utc',      label: 'UTC',                value: date.toLocaleString('en-US', utcOpts), icon: 'bi-globe' },
      { key: 'rfc',      label: 'RFC 2822',           value: date.toUTCString(), icon: 'bi-envelope' },
      { key: 'relative', label: 'Relative',           value: this.relativeTime(date), icon: 'bi-hourglass-split' },
      { key: 'dow',      label: 'Day of week',        value: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: this.selectedTz }), icon: 'bi-calendar-day' },
      { key: 'doy',      label: 'Day of year',        value: `${dayOfYear} / ${this.isLeapYear(tzYear) ? 366 : 365}`, icon: 'bi-calendar3' },
      { key: 'woy',      label: 'ISO week',           value: `W${String(weekOfYear).padStart(2, '0')}`, icon: 'bi-calendar-week' },
    ];
  }

  private getISOWeek(year: number, month: number, day: number): number {
    const d = new Date(Date.UTC(year, month - 1, day));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  private relativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.abs(Math.floor(diffMs / 1000));
    const isPast = diffMs > 0;
    const suffix = isPast ? 'ago' : 'from now';

    const units: { limit: number; div: number; name: string }[] = [
      { limit: 60,       div: 1,        name: 'second' },
      { limit: 3600,     div: 60,       name: 'minute' },
      { limit: 86400,    div: 3600,     name: 'hour' },
      { limit: 604800,   div: 86400,    name: 'day' },
      { limit: 2629800,  div: 604800,   name: 'week' },
      { limit: 31557600, div: 2629800,  name: 'month' },
      { limit: Infinity, div: 31557600, name: 'year' },
    ];

    for (const u of units) {
      if (seconds < u.limit) {
        const v = Math.floor(seconds / u.div);
        return `${v} ${u.name}${v !== 1 ? 's' : ''} ${suffix}`;
      }
    }
    return '';
  }

  clearOutputs(): void {
    this.hasValidInput = false;
    this.outputs = [];
    this.outputDate = null;
  }

  clear(): void {
    this.unixInput = '';
    this.dateTimeInput = '';
    this.isoInput = '';
    this.clearOutputs();
  }

  copyToClipboard(text: string, label: string): void {
    this.utilityService.copyToClipboard(text, { label: `${label} copied` });
  }
}
