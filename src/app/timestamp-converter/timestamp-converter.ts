import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

@Component({
  selector: 'app-timestamp-converter',
  standalone: false,
  templateUrl: './timestamp-converter.html',
  styleUrl: './timestamp-converter.scss',
})
export class TimestampConverter implements OnInit {
  // Input fields
  unixInput = '';
  dateTimeInput = '';
  isoInput = '';

  // Output fields
  unixSeconds = '';
  unixMilliseconds = '';
  isoString = '';
  localTimeString = '';
  utcTimeString = '';
  relativeTime = '';

  hasValidInput = false;
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  onUnixInputChange() {
    if (!this.unixInput || this.unixInput.trim() === '') {
      this.clearOutputs();
      return;
    }

    try {
      const timestamp = parseInt(this.unixInput.trim());
      if (isNaN(timestamp)) {
        this.clearOutputs();
        return;
      }

      // Auto-detect: if <= 10 digits, treat as seconds; otherwise milliseconds
      const milliseconds = timestamp.toString().length <= 10 ? timestamp * 1000 : timestamp;
      const date = new Date(milliseconds);

      if (isNaN(date.getTime())) {
        this.clearOutputs();
        return;
      }

      this.updateFromDate(date);
    } catch {
      this.clearOutputs();
    }
  }

  onDateTimeChange() {
    if (!this.dateTimeInput || this.dateTimeInput.trim() === '') {
      this.clearOutputs();
      return;
    }

    try {
      const date = new Date(this.dateTimeInput);
      if (isNaN(date.getTime())) {
        this.clearOutputs();
        return;
      }

      this.updateFromDate(date);
    } catch {
      this.clearOutputs();
    }
  }

  onIsoInputChange() {
    if (!this.isoInput || this.isoInput.trim() === '') {
      this.clearOutputs();
      return;
    }

    try {
      const date = new Date(this.isoInput.trim());
      if (isNaN(date.getTime())) {
        this.clearOutputs();
        return;
      }

      this.updateFromDate(date);
    } catch {
      this.clearOutputs();
    }
  }

  updateFromDate(date: Date) {
    this.hasValidInput = true;

    // Update all output formats
    this.unixSeconds = Math.floor(date.getTime() / 1000).toString();
    this.unixMilliseconds = date.getTime().toString();
    this.isoString = date.toISOString();

    // Format local time
    const localOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    this.localTimeString = date.toLocaleString('en-US', localOptions);

    // Format UTC time
    const utcOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    };
    this.utcTimeString = date.toLocaleString('en-US', utcOptions);

    // Update datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    this.dateTimeInput = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Update relative time
    this.calculateRelativeTime(date);

    // Sync inputs
    this.unixInput = this.unixSeconds;
    this.isoInput = this.isoString;
  }

  calculateRelativeTime(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.abs(Math.floor(diffMs / 1000));
    
    const isPast = diffMs > 0;
    const suffix = isPast ? 'ago' : 'from now';

    if (diffSeconds < 60) {
      this.relativeTime = `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ${suffix}`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      this.relativeTime = `${minutes} minute${minutes !== 1 ? 's' : ''} ${suffix}`;
    } else if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      this.relativeTime = `${hours} hour${hours !== 1 ? 's' : ''} ${suffix}`;
    } else if (diffSeconds < 2592000) {
      const days = Math.floor(diffSeconds / 86400);
      this.relativeTime = `${days} day${days !== 1 ? 's' : ''} ${suffix}`;
    } else if (diffSeconds < 31536000) {
      const months = Math.floor(diffSeconds / 2592000);
      this.relativeTime = `${months} month${months !== 1 ? 's' : ''} ${suffix}`;
    } else {
      const years = Math.floor(diffSeconds / 31536000);
      this.relativeTime = `${years} year${years !== 1 ? 's' : ''} ${suffix}`;
    }
  }

  useCurrentTimestamp() {
    const now = new Date();
    this.updateFromDate(now);
  }

  clearOutputs() {
    this.hasValidInput = false;
    this.unixSeconds = '';
    this.unixMilliseconds = '';
    this.isoString = '';
    this.localTimeString = '';
    this.utcTimeString = '';
    this.relativeTime = '';
  }

  clear() {
    this.unixInput = '';
    this.dateTimeInput = '';
    this.isoInput = '';
    this.clearOutputs();
  }

  async copyToClipboard(text: string): Promise<void> {
    await this.utilityService.copyToClipboard(text);
  }
}
