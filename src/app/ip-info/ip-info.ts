import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
  timezoneId?: string;
  timezoneAbbr?: string;
  timezoneUtc?: string;
  timezoneCurrentTime?: string;
  source?: string;
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

const CONSENT_STORAGE_KEY = 'ipInfo:lookupConsent';

@Component({
  selector: 'app-ip-info',
  standalone: false,
  templateUrl: './ip-info.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './ip-info.scss',
})
export class IpInfo implements OnInit {
  network: NetworkInfo = {};
  browser: BrowserInfo | null = null;

  loading = false;
  errorMessage = '';
  isMobile = false;

  consentGiven = false;
  hasAttempted = false;

  private lookupSeq = 0;

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.collectBrowserInfo();

    try {
      this.consentGiven = localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
    } catch {
      // localStorage may be unavailable (private mode, blocked); treat as no consent.
      this.consentGiven = false;
    }

    if (this.consentGiven) {
      this.lookup();
    }
  }

  acceptDisclaimer(): void {
    this.consentGiven = true;
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    } catch {
      // Persisting is best-effort; the in-memory flag is sufficient for this session.
    }
    this.lookup();
  }

  revokeConsent(): void {
    this.consentGiven = false;
    // Invalidate any in-flight lookup so its post-await state mutations are ignored.
    this.lookupSeq++;
    this.loading = false;
    this.network = {};
    this.errorMessage = '';
    this.hasAttempted = false;
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async lookup(): Promise<void> {
    if (!this.consentGiven) return;

    const seq = ++this.lookupSeq;

    this.loading = true;
    this.errorMessage = '';
    this.network = {};
    this.hasAttempted = true;

    // Try providers in order. Each one returns partial data or throws.
    const providers: Array<() => Promise<NetworkInfo>> = [
      () => this.lookupIpapiCo(),
      () => this.lookupFreeipapi(),
    ];

    const failures: string[] = [];
    for (const fetchFn of providers) {
      try {
        const result = await fetchFn();
        // Bail if a newer lookup started or consent was revoked while awaiting.
        if (seq !== this.lookupSeq || !this.consentGiven) return;
        if (result.ip) {
          this.network = result;
          this.loading = false;
          return;
        }
      } catch (err: any) {
        if (seq !== this.lookupSeq || !this.consentGiven) return;
        failures.push(err?.message || 'unknown error');
      }
    }

    if (seq !== this.lookupSeq || !this.consentGiven) return;
    this.errorMessage =
      failures.length > 0
        ? `All IP lookup providers failed: ${failures.join('; ')}. The service may be rate-limited or blocked by a network filter / extension.`
        : 'No IP lookup providers available.';
    this.loading = false;
  }

  /** fetch() with an abort-based timeout so a hung provider can't stall the chain. */
  private async fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async lookupIpapiCo(): Promise<NetworkInfo> {
    const response = await this.fetchWithTimeout('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error(`ipapi.co HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`ipapi.co: ${data.reason || 'error'}`);
    }

    const raw = (data.utc_offset || '').trim();
    const m = /^([+-])(\d{2})(\d{2})$/.exec(raw);
    const timezoneUtc = m ? `${m[1]}${m[2]}:${m[3]}` : undefined;

    return {
      source: 'ipapi.co',
      ip: data.ip,
      type: data.version,
      continent: data.continent_code,
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      callingCode: data.country_calling_code?.replace('+', ''),
      isp: data.org,
      org: data.org,
      asn: data.asn,
      domain: undefined,
      timezoneId: data.timezone,
      timezoneAbbr: undefined,
      timezoneUtc,
      timezoneCurrentTime: undefined,
    };
  }

  private async lookupFreeipapi(): Promise<NetworkInfo> {
    const response = await this.fetchWithTimeout('https://freeipapi.com/api/json/');
    if (!response.ok) {
      throw new Error(`freeipapi HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data.ipAddress) {
      throw new Error('freeipapi: no IP in response');
    }

    return {
      source: 'freeipapi.com',
      ip: data.ipAddress,
      type: data.ipVersion === 4 ? 'IPv4' : data.ipVersion === 6 ? 'IPv6' : undefined,
      continent: data.continent,
      country: data.countryName,
      countryCode: data.countryCode,
      region: data.regionName,
      city: data.cityName,
      postal: data.zipCode,
      latitude: data.latitude,
      longitude: data.longitude,
      timezoneId: data.timeZone,
    };
  }

  collectBrowserInfo(): void {
    const ua = navigator.userAgent;
    const offsetMinutes = new Date().getTimezoneOffset();
    const sign = offsetMinutes <= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMinutes);
    const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
    const mm = String(absMin % 60).padStart(2, '0');

    const nav = navigator as any;

    const dnt = (navigator as any).doNotTrack ?? (window as any).doNotTrack ?? (navigator as any).msDoNotTrack;
    const doNotTrack =
      dnt === '1' || dnt === 'yes' || dnt === true
        ? 'Enabled'
        : dnt === '0' || dnt === 'no'
          ? 'Disabled'
          : 'Not set';

    this.browser = {
      userAgent: ua,
      browser: this.detectBrowser(ua),
      os: this.detectOs(ua),
      language: navigator.language,
      languages: (navigator.languages || []).join(', '),
      platform: nav.userAgentData?.platform || navigator.platform || 'Unknown',
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      doNotTrack,
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
    // iOS variants of Chrome/Edge/Firefox all carry Safari/AppleWebKit, so detect them first.
    if (/CriOS\//.test(ua)) return 'Chrome';
    if (/EdgiOS\//.test(ua)) return 'Microsoft Edge';
    if (/FxiOS\//.test(ua)) return 'Firefox';
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
    // iPadOS reports a desktop Mac UA but exposes multiple touch points.
    if (/Mac OS X/.test(ua) && (navigator as any).maxTouchPoints > 1) return 'iPadOS';
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
