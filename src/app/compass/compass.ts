import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { SensorService } from '../services/sensor.service';

type CompassStatus = 'idle' | 'waiting' | 'active' | 'unsupported' | 'denied' | 'insecure';

// Vector low-pass factor for the heading. Smoothing a raw angle would jump at the
// 0°/360° wrap, so we filter the unit vector (cos, sin) instead.
const SMOOTHING = 0.15;
// Generous enough that a phone's cold-start magnetometer won't flash the desktop
// "no sensor" card before the first reading arrives.
const NO_SIGNAL_MS = 2000;

const CARDINALS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

interface OrientationEventLike {
  alpha: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

@Component({
  selector: 'app-compass',
  standalone: false,
  templateUrl: './compass.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './compass.scss',
})
export class Compass implements OnInit, OnDestroy {
  status: CompassStatus = 'idle';
  needsGesture = false;

  heading = 0; // smoothed, 0..360
  headingRounded = 0;
  cardinal = 'N';
  /** False when only relative orientation is available (no true north reference). */
  absolute = true;
  accuracy: number | null = null;
  pageUrl = '';

  /** Degree positions for the dial tick marks (every 15°). */
  readonly ticks = Array.from({ length: 24 }, (_, i) => i * 15);

  /** Throttled text for the screen-reader live region (the rose itself is decorative). */
  ariaHeading = '';
  private lastAnnouncedDeg = -1;
  private lastAnnouncedCardinal = '';

  private vx = 1;
  private vy = 0;
  private seeded = false;
  private gotAbsolute = false;
  private listening = false;
  private noSignalTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public utilityService: UtilityService,
    private sensor: SensorService,
  ) {}

  ngOnInit(): void {
    this.pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (!this.sensor.secureContext) {
      this.status = 'insecure';
      return;
    }
    if (!this.sensor.hasOrientation) {
      this.status = 'unsupported';
      return;
    }

    if (this.sensor.orientationNeedsPermission) {
      this.needsGesture = true;
      this.status = 'idle';
    } else {
      this.start();
    }
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  async start(): Promise<void> {
    if (this.sensor.orientationNeedsPermission) {
      const result = await this.sensor.requestOrientation();
      if (result === 'denied' || result === 'error') {
        this.status = 'denied';
        return;
      }
      if (result === 'unsupported') {
        this.status = 'unsupported';
        return;
      }
    }
    this.beginListening();
  }

  retry(): void {
    this.status = 'idle';
    this.start();
  }

  private beginListening(): void {
    if (this.listening) return;
    this.listening = true;
    this.needsGesture = false;
    this.status = 'waiting';
    // `deviceorientationabsolute` (Chrome/Android) gives true magnetic north.
    // Plain `deviceorientation` carries `webkitCompassHeading` on iOS and serves
    // as the relative-only fallback elsewhere.
    window.addEventListener('deviceorientationabsolute', this.onAbsolute, true);
    window.addEventListener('deviceorientation', this.onPlain, true);
    this.noSignalTimer = setTimeout(() => {
      if (this.status === 'waiting') this.status = 'unsupported';
    }, NO_SIGNAL_MS);
  }

  private stopListening(): void {
    if (this.noSignalTimer) {
      clearTimeout(this.noSignalTimer);
      this.noSignalTimer = null;
    }
    if (this.listening) {
      window.removeEventListener('deviceorientationabsolute', this.onAbsolute, true);
      window.removeEventListener('deviceorientation', this.onPlain, true);
      this.listening = false;
    }
  }

  private readonly onAbsolute = (event: Event): void => {
    this.apply(event as unknown as OrientationEventLike, true);
  };

  private readonly onPlain = (event: Event): void => {
    const e = event as unknown as OrientationEventLike;
    this.apply(e, e.absolute === true);
  };

  private apply(e: OrientationEventLike, isAbsoluteEvent: boolean): void {
    let h: number;
    let abs: boolean;

    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      // iOS already reports a clockwise-from-north compass heading.
      h = e.webkitCompassHeading;
      abs = true;
      if (typeof e.webkitCompassAccuracy === 'number') {
        this.accuracy = e.webkitCompassAccuracy;
      }
    } else if (e.alpha !== null && e.alpha !== undefined) {
      // alpha is measured about the device-frame Z axis and is NOT corrected for
      // screen orientation, so subtract the current orientation angle (90/180/270
      // in landscape) before converting to a compass heading. webkitCompassHeading
      // (handled above) is already orientation-compensated and skips this.
      const screenAngle =
        (typeof screen !== 'undefined' && screen.orientation
          ? screen.orientation.angle
          : (window as unknown as { orientation?: number }).orientation) ?? 0;
      h = (360 - e.alpha - screenAngle + 360) % 360;
      abs = isAbsoluteEvent;
    } else {
      return;
    }

    // Once we've locked onto an absolute (true-north) source, ignore relative
    // events so a stray `deviceorientation` can't drag the needle off true north.
    if (this.gotAbsolute && !abs) return;
    if (abs) this.gotAbsolute = true;
    this.absolute = abs;

    if (this.noSignalTimer) {
      clearTimeout(this.noSignalTimer);
      this.noSignalTimer = null;
    }
    this.status = 'active';

    const rad = (h * Math.PI) / 180;
    const cx = Math.cos(rad);
    const cy = Math.sin(rad);
    if (!this.seeded) {
      this.vx = cx;
      this.vy = cy;
      this.seeded = true;
    } else {
      this.vx += (cx - this.vx) * SMOOTHING;
      this.vy += (cy - this.vy) * SMOOTHING;
    }

    const deg = (Math.atan2(this.vy, this.vx) * 180) / Math.PI;
    this.heading = (deg + 360) % 360;
    this.headingRounded = Math.round(this.heading) % 360;
    this.cardinal = CARDINALS[Math.round(this.heading / 22.5) % 16];

    // Announce to screen readers only when the heading moves a few degrees or the
    // cardinal sector changes, so a polite live region updates at a readable pace.
    if (
      this.cardinal !== this.lastAnnouncedCardinal
      || Math.abs(this.headingRounded - this.lastAnnouncedDeg) >= 5
    ) {
      this.lastAnnouncedDeg = this.headingRounded;
      this.lastAnnouncedCardinal = this.cardinal;
      this.ariaHeading = `Heading ${this.headingRounded} degrees, ${this.cardinal}`;
    }
  }

  /** Counter-rotate the rose so its N mark always points at real north. */
  get roseDegrees(): number {
    return -this.heading;
  }

  get accuracyText(): string {
    if (this.accuracy === null) return '';
    if (this.accuracy < 0) return 'needs calibration';
    return `±${Math.round(this.accuracy)}°`;
  }

  copyUrl(): void {
    this.utilityService.copyToClipboard(this.pageUrl, { label: 'Page link copied' });
  }
}
