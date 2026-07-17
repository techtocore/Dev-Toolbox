import {
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { SensorService } from '../services/sensor.service';

type MotionStatus =
  | 'idle'
  | 'waiting'
  | 'active'
  | 'paused'
  | 'unsupported'
  | 'denied'
  | 'insecure'
  | 'error';

interface AxisVector {
  x: number;
  y: number;
  z: number;
}

interface RotationVector {
  alpha: number;
  beta: number;
  gamma: number;
}

const EMPTY_AXIS: AxisVector = { x: 0, y: 0, z: 0 };
const EMPTY_ROTATION: RotationVector = { alpha: 0, beta: 0, gamma: 0 };
const GRAVITY_MS2 = 9.80665;
const AXIS_FULL_SCALE = 15;
const TRACE_FULL_SCALE = 15;
const SHAKE_THRESHOLD = 12;
const SHAKE_COOLDOWN_MS = 650;
const UI_INTERVAL_MS = 80;
const NO_SIGNAL_MS = 5000;
const TRACE_SAMPLES = 64;

@Component({
  selector: 'app-motion-lab',
  standalone: false,
  templateUrl: './motion-lab.html',
  styleUrl: './motion-lab.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MotionLab implements OnInit, OnDestroy {
  status: MotionStatus = 'idle';
  permissionRequired = false;
  errorDetail = '';
  pageUrl = '';

  acceleration: AxisVector = { ...EMPTY_AXIS };
  gravity: AxisVector = { ...EMPTY_AXIS };
  rotation: RotationVector = { ...EMPTY_ROTATION };
  hasAcceleration = false;
  hasGravity = false;
  hasRotation = false;

  motionMagnitude = 0;
  gravityG = 0;
  rotationMagnitude = 0;
  peakMotion = 0;
  sampleRate = 0;
  shakeCount = 0;
  tracePoints = '';
  announcement = '';

  private listening = false;
  private starting = false;
  private permissionGranted = false;
  private noSignalTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventAt = 0;
  private lastUiAt = 0;
  private lastShakeAt = -Infinity;
  private lastAnnouncementAt = 0;
  private rawPeak = 0;
  private rawShakeCount = 0;
  private smoothedRate = 0;
  private readonly history = Array.from({ length: TRACE_SAMPLES }, () => 0);

  constructor(
    public utilityService: UtilityService,
    private sensor: SensorService,
    private zone: NgZone,
  ) {
    this.updateTrace();
  }

  ngOnInit(): void {
    this.pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (!this.sensor.secureContext) {
      this.status = 'insecure';
      return;
    }
    if (!this.sensor.hasMotion) {
      this.status = 'unsupported';
      return;
    }

    this.permissionRequired = this.sensor.motionNeedsPermission;
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  async start(): Promise<void> {
    if (this.starting || this.status === 'active' || this.status === 'waiting') return;
    this.starting = true;
    this.errorDetail = '';
    this.status = 'waiting';

    try {
      if (this.permissionRequired && !this.permissionGranted) {
        const result = await this.sensor.requestMotion();
        if (result === 'denied') {
          this.status = 'denied';
          return;
        }
        if (result === 'unsupported') {
          this.status = 'unsupported';
          return;
        }
        if (result === 'error') {
          this.status = 'error';
          this.errorDetail = 'The browser could not complete the motion permission request.';
          return;
        }
        this.permissionGranted = true;
      }

      this.beginListening();
    } finally {
      this.starting = false;
    }
  }

  pause(): void {
    this.stopListening();
    this.status = 'paused';
    this.announcement = 'Motion sampling paused.';
  }

  retry(): void {
    this.stopListening();
    this.status = 'idle';
    void this.start();
  }

  reset(): void {
    this.acceleration = { ...EMPTY_AXIS };
    this.gravity = { ...EMPTY_AXIS };
    this.rotation = { ...EMPTY_ROTATION };
    this.motionMagnitude = 0;
    this.gravityG = 0;
    this.rotationMagnitude = 0;
    this.peakMotion = 0;
    this.shakeCount = 0;
    this.rawPeak = 0;
    this.rawShakeCount = 0;
    this.history.fill(0);
    this.updateTrace();
    this.announcement = 'Motion statistics reset.';
  }

  axisPosition(value: number): number {
    return 50 + this.clamp(value / AXIS_FULL_SCALE, -1, 1) * 46;
  }

  get markerX(): number {
    return 50 + this.clamp(this.acceleration.x / AXIS_FULL_SCALE, -1, 1) * 40;
  }

  get markerY(): number {
    return 50 + this.clamp(-this.acceleration.y / AXIS_FULL_SCALE, -1, 1) * 40;
  }

  get activityLabel(): string {
    if (!this.hasAcceleration) return 'Motion vector unavailable';
    if (this.motionMagnitude >= SHAKE_THRESHOLD) return 'Shake detected';
    if (this.motionMagnitude >= 2.5) return 'Moving';
    if (this.motionMagnitude >= 0.45) return 'Light motion';
    return 'Still';
  }

  get activityClass(): string {
    if (this.motionMagnitude >= SHAKE_THRESHOLD) return 'activity-shake';
    if (this.motionMagnitude >= 2.5) return 'activity-moving';
    return 'activity-still';
  }

  copyUrl(): void {
    this.utilityService.copyToClipboard(this.pageUrl, { label: 'Page link copied' });
  }

  private beginListening(): void {
    if (this.listening) return;

    this.status = 'waiting';
    this.listening = true;
    this.lastEventAt = 0;
    this.lastUiAt = 0;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('devicemotion', this.onMotion, true);
    });
    this.noSignalTimer = setTimeout(() => {
      if (this.status === 'waiting') {
        this.stopListening();
        this.status = 'unsupported';
      }
    }, NO_SIGNAL_MS);
  }

  private stopListening(): void {
    if (this.noSignalTimer) {
      clearTimeout(this.noSignalTimer);
      this.noSignalTimer = null;
    }
    if (this.listening) {
      window.removeEventListener('devicemotion', this.onMotion, true);
      this.listening = false;
    }
  }

  private readonly onMotion = (event: DeviceMotionEvent): void => {
    const acceleration = this.readAxis(event.acceleration);
    const gravity = this.readAxis(event.accelerationIncludingGravity);
    const rotation = this.readRotation(event.rotationRate);
    if (!acceleration && !gravity && !rotation) return;

    if (this.noSignalTimer) {
      clearTimeout(this.noSignalTimer);
      this.noSignalTimer = null;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const magnitude = acceleration
      ? Math.hypot(acceleration.x, acceleration.y, acceleration.z)
      : 0;
    const gravityMagnitude = gravity
      ? Math.hypot(gravity.x, gravity.y, gravity.z) / GRAVITY_MS2
      : 0;
    const rotationMagnitude = rotation
      ? Math.hypot(rotation.alpha, rotation.beta, rotation.gamma)
      : 0;

    this.rawPeak = Math.max(this.rawPeak, magnitude);
    if (acceleration && magnitude >= SHAKE_THRESHOLD && now - this.lastShakeAt >= SHAKE_COOLDOWN_MS) {
      this.lastShakeAt = now;
      this.rawShakeCount++;
    }

    const intervalRate = event.interval > 0 ? 1000 / event.interval : 0;
    const measuredRate = this.lastEventAt > 0 && now > this.lastEventAt
      ? 1000 / (now - this.lastEventAt)
      : 0;
    const nextRate = intervalRate || measuredRate;
    if (Number.isFinite(nextRate) && nextRate > 0) {
      this.smoothedRate = this.smoothedRate === 0
        ? nextRate
        : this.smoothedRate + (nextRate - this.smoothedRate) * 0.15;
    }
    this.lastEventAt = now;

    if (now - this.lastUiAt < UI_INTERVAL_MS) return;
    this.lastUiAt = now;

    this.zone.run(() => {
      this.status = 'active';
      this.hasAcceleration = acceleration !== null;
      this.hasGravity = gravity !== null;
      this.hasRotation = rotation !== null;
      if (acceleration) this.acceleration = acceleration;
      if (gravity) this.gravity = gravity;
      if (rotation) this.rotation = rotation;
      this.motionMagnitude = magnitude;
      this.gravityG = gravityMagnitude;
      this.rotationMagnitude = rotationMagnitude;
      this.peakMotion = this.rawPeak;
      this.shakeCount = this.rawShakeCount;
      this.sampleRate = this.smoothedRate;

      this.history.shift();
      this.history.push(magnitude);
      this.updateTrace();

      if (now - this.lastAnnouncementAt >= 1200) {
        this.lastAnnouncementAt = now;
        this.announcement = `${this.activityLabel}. Acceleration ${magnitude.toFixed(1)} metres per second squared.`;
      }
    });
  };

  private readAxis(reading: DeviceMotionEventAcceleration | null): AxisVector | null {
    if (!reading) return null;
    const values = [reading.x, reading.y, reading.z];
    if (!values.some(value => typeof value === 'number' && Number.isFinite(value))) return null;
    return {
      x: this.finiteOrZero(reading.x),
      y: this.finiteOrZero(reading.y),
      z: this.finiteOrZero(reading.z),
    };
  }

  private readRotation(reading: DeviceMotionEventRotationRate | null): RotationVector | null {
    if (!reading) return null;
    const values = [reading.alpha, reading.beta, reading.gamma];
    if (!values.some(value => typeof value === 'number' && Number.isFinite(value))) return null;
    return {
      alpha: this.finiteOrZero(reading.alpha),
      beta: this.finiteOrZero(reading.beta),
      gamma: this.finiteOrZero(reading.gamma),
    };
  }

  private finiteOrZero(value: number | null): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private updateTrace(): void {
    const denominator = Math.max(1, this.history.length - 1);
    this.tracePoints = this.history
      .map((value, index) => {
        const x = (index / denominator) * 300;
        const y = 92 - this.clamp(value / TRACE_FULL_SCALE, 0, 1) * 78;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}