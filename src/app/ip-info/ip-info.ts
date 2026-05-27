import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface NetworkInfo {
  ip?: string;
  type?: string;
  continent?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  callingCode?: string;
  isp?: string;
  org?: string;
  asn?: string;
  domain?: string;
  reverseHostname?: string;
  timezoneId?: string;
  timezoneAbbr?: string;
  timezoneUtc?: string;
  timezoneCurrentTime?: string;
}

interface BrowserInfo {
  userAgent: string;
  browser: string;
  os: string;
  language: string;
  languages: string;
  platform: string;
  cookiesEnabled: boolean;
  onlineStatus: boolean;
  doNotTrack: string;
  vendor: string;
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
  pixelRatio: number;
  localTimezone: string;
  localTimezoneOffset: string;
  localTime: string;
  hardwareConcurrency: number;
  deviceMemory: string;
  touchSupport: boolean;
}

@Component({
  selector: 'app-ip-info',
  standalone: false,
  templateUrl: './ip-info.html',
  styleUrl: './ip-info.scss',
})
export class IpInfo implements OnInit {
  network: NetworkInfo = {};
  browser: BrowserInfo | null = null;
  loading = false;
  errorMessage = '';
  isMobile = false;

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.collectBrowserInfo();
    this.lookup();
  }

  async lookup(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.network = {};

    try {
      const response = await fetch('https://ipwho.is/');
      if (!response.ok) {
        throw new Error(`Lookup failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success === false) {
        throw new Error(data.message || 'Unable to retrieve IP information');
      }

      this.network = {
        ip: data.ip,
        type: data.type,
        continent: data.continent,
        country: data.country,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        postal: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        callingCode: data.calling_code,
        isp: data.connection?.isp,
        org: data.connection?.org,
        asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
        domain: data.connection?.domain,
        reverseHostname: data.connection?.domain || data.connection?.org,
        timezoneId: data.timezone?.id,
        timezoneAbbr: data.timezone?.abbr,
        timezoneUtc: data.timezone?.utc,
        timezoneCurrentTime: data.timezone?.current_time,
      };
    } catch (err: any) {
      this.errorMessage =
        err?.message ||
        'Failed to look up IP info. Check your network or any privacy extensions blocking the request.';
    } finally {
      this.loading = false;
    }
  }

  collectBrowserInfo(): void {
    const ua = navigator.userAgent;
    const offsetMinutes = new Date().getTimezoneOffset();
    const sign = offsetMinutes <= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMinutes);
    const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
    const mm = String(absMin % 60).padStart(2, '0');

    const nav = navigator as any;

    this.browser = {
      userAgent: ua,
      browser: this.detectBrowser(ua),
      os: this.detectOs(ua),
      language: navigator.language,
      languages: (navigator.languages || []).join(', '),
      platform: nav.userAgentData?.platform || navigator.platform || 'Unknown',
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      doNotTrack: navigator.doNotTrack === '1' ? 'Enabled' : 'Disabled / Not set',
      vendor: navigator.vendor || 'Unknown',
      screenResolution: `${screen.width} x ${screen.height}`,
      viewportSize: `${window.innerWidth} x ${window.innerHeight}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localTimezoneOffset: `UTC${sign}${hh}:${mm}`,
      localTime: new Date().toString(),
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: nav.deviceMemory ? `${nav.deviceMemory} GB` : 'Unknown',
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
  }

  detectBrowser(ua: string): string {
    if (/Edg\//.test(ua)) return 'Microsoft Edge';
    if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua)) return 'Safari';
    if (/MSIE |Trident\//.test(ua)) return 'Internet Explorer';
    return 'Unknown';
  }

  detectOs(ua: string): string {
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
    if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6\.2/.test(ua)) return 'Windows 8';
    if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  }

  get mapsUrl(): string | null {
    if (this.network.latitude == null || this.network.longitude == null) {
      return null;
    }
    return `https://www.openstreetmap.org/?mlat=${this.network.latitude}&mlon=${this.network.longitude}#map=10/${this.network.latitude}/${this.network.longitude}`;
  }

  async copyToClipboard(text: string | number | undefined): Promise<void> {
    if (text === undefined || text === null) return;
    await this.utilityService.copyToClipboard(String(text));
  }

  exportJson(): void {
    const payload = {
      network: this.network,
      browser: this.browser,
      generatedAt: new Date().toISOString(),
    };
    this.utilityService.downloadFile(
      JSON.stringify(payload, undefined, 2),
      'application/json',
      'ip-info.json'
    );
  }
}
