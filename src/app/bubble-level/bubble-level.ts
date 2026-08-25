import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { SensorService } from '../services/sensor.service';

type LevelStatus = 'idle' | 'waiting' | 'active' | 'unsupported' | 'denied' | 'insecure';

// How many degrees of tilt push the bubble all the way to the rim. The bubble
// offset is emitted as a unit vector (-1..1) and scaled to the plate radius in
// CSS, so it stays inside the rim at any responsive plate size.
const FULL_SCALE_DEG = 25;
// Within this many degrees of flat (after calibration) we call the surface level.
const LEVEL_TOLERANCE_DEG = 0.6;
// Low-pass factor — higher = snappier but jitterier. 0.2 reads smooth by hand.
const SMOOTHING = 0.2;
// If no populated reading arrives within this window, assume there's no sensor.
// Generous enough that a phone's cold-start sensor won't flash the desktop card.
const NO_SIGNAL_MS = 2000;

@Component({
  selector: 'app-bubble-level',
  standalone: false,
  templateUrl: './bubble-level.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './bubble-level.scss',
})
export class BubbleLevel implements OnInit, OnDestroy {
  status: LevelStatus = 'idle';
  /** iOS: the sensor can only be unlocked from a tap, so we show a Start button. */
  needsGesture = false;

  // Calibrated, smoothed angles shown to the user (degrees).
  pitch = 0; // front-to-back tilt (from beta)
  roll = 0; // left-to-right tilt (from gamma)
  isLevel = false;

  // Bubble offset from centre as a unit vector (-1..1 per axis); CSS scales it
  // to the plate radius, so it never overruns a smaller (responsive) plate.
  bubbleNx = 0;
  bubbleNy = 0;

  /** Throttled text for the screen-reader live region (only changes on a meaningful step). */
  announcement = '';

  haptics = true;
  hapticsSupported = false;
  pageUrl = '';

  // Raw smoothed readings, before the calibration offset is applied.
  private rawPitch = 0;
  private rawRoll = 0;
  private zeroPitch = 0;
  private zeroRoll = 0;
  private wasLevel = false;
  private seededSmoothing = false;
  private noSignalTimer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  constructor(
    public utilityService: UtilityService,
    private sensor: SensorService,
  ) {}

  ngOnInit(): void {
    this.hapticsSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
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
      // iOS — wait for the user to tap Start so we can request permission.
      this.needsGesture = true;
      this.status = 'idle';
    } else {
      // Android / desktop — start listening immediately. Desktop exposes the API
      // but never fires a populated event, which the no-signal timer catches.
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

  /** Re-listen after a permission denial without a full page reload. */
  retry(): void {
    this.status = 'idle';
    this.start();
  }

  private beginListening(): void {
    if (this.listening) return;
    this.listening = true;
    this.needsGesture = false;
    this.status = 'waiting';
    window.addEventListener('deviceorientation', this.onOrientation, true);
    this.noSignalTimer = setTimeout(() => {
      if (this.status === 'waiting') {
        this.status = 'unsupported';
        this.stopListening();
      }
    }, NO_SIGNAL_MS);
  }

  private stopListening(): void {
    if (this.noSignalTimer) {
      clearTimeout(this.noSignalTimer);
      this.noSignalTimer = null;
    }
    if (this.listening) {
      window.removeEventListener('deviceorientation', this.onOrientation, true);
      this.listening = false;
    }
  }

  private readonly onOrientation = (event: DeviceOrientationEvent): void => {
    // Desktop Chrome can fire a single all-null event; that isn't a real reading.
    if (event.beta === null && event.gamma === null) return;

    if (this.noSignalTimer) {
      clearTimeout(this.noSignalTimer);
      this.noSignalTimer = null;
    }
    this.status = 'active';

    const beta = event.beta ?? 0; // front/back, -180..180
    const gamma = event.gamma ?? 0; // left/right, -90..90

    // The device-frame beta/gamma are reported relative to the device's natural
    // orientation. Rotate them into the current screen frame so pitch/roll (and the
    // bubble direction) stay correct when the screen is rotated to landscape.
    const angle = this.screenAngle();
    let p: number;
    let r: number;
    switch (angle) {
      case 90:
        p = gamma;
        r = -beta;
        break;
      case 180:
        p = -beta;
        r = -gamma;
        break;
      case 270:
        p = -gamma;
        r = beta;
        break;
      default:
        p = beta;
        r = gamma;
        break;
    }

    if (!this.seededSmoothing) {
      // Jump straight to the first reading so the bubble doesn't glide in from 0.
      this.rawPitch = p;
      this.rawRoll = r;
      this.seededSmoothing = true;
    } else {
      this.rawPitch += (p - this.rawPitch) * SMOOTHING;
      this.rawRoll += (r - this.rawRoll) * SMOOTHING;
    }

    this.pitch = this.rawPitch - this.zeroPitch;
    this.roll = this.rawRoll - this.zeroRoll;
    this.updateBubble();
  };

  private updateBubble(): void {
    // Normalise each axis to -1..1, then clamp the combined vector to the rim so
    // the bubble tracks a circular plate instead of a square one.
    let nx = this.clampUnit(this.roll / FULL_SCALE_DEG);
    let ny = this.clampUnit(-this.pitch / FULL_SCALE_DEG);
    const mag = Math.hypot(nx, ny);
    if (mag > 1) {
      nx /= mag;
      ny /= mag;
    }
    this.bubbleNx = nx;
    this.bubbleNy = ny;

    const level = Math.abs(this.pitch) <= LEVEL_TOLERANCE_DEG
      && Math.abs(this.roll) <= LEVEL_TOLERANCE_DEG;
    this.isLevel = level;

    // Buzz once on the rising edge of "just became level".
    if (level && !this.wasLevel && this.haptics && this.hapticsSupported) {
      navigator.vibrate?.(30);
    }
    this.wasLevel = level;

    // Update the live region only when the rounded reading or level state changes,
    // so a screen reader gets meaningful updates rather than per-frame noise.
    const next = level
      ? 'Level.'
      : `Not level. Pitch ${Math.round(this.pitch)} degrees, roll ${Math.round(this.roll)} degrees.`;
    if (next !== this.announcement) {
      this.announcement = next;
    }
  }

  private clampUnit(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.max(-1, Math.min(1, n));
  }

  /** Current screen rotation in degrees (0/90/180/270), normalised; 0 if unknown. */
  private screenAngle(): number {
    const raw =
      (typeof screen !== 'undefined' && screen.orientation
        ? screen.orientation.angle
        : (window as unknown as { orientation?: number }).orientation) ?? 0;
    return ((raw % 360) + 360) % 360;
  }

  /** Treat the current orientation as dead flat (e.g. a surface you trust). */
  calibrate(): void {
    this.zeroPitch = this.rawPitch;
    this.zeroRoll = this.rawRoll;
    this.updateBubble();
  }

  resetCalibration(): void {
    this.zeroPitch = 0;
    this.zeroRoll = 0;
    this.updateBubble();
  }

  toggleHaptics(): void {
    this.haptics = !this.haptics;
  }

  copyUrl(): void {
    this.utilityService.copyToClipboard(this.pageUrl, { label: 'Page link copied' });
  }
}
