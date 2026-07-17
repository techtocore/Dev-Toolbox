import { Injectable } from '@angular/core';

export type SensorPermission = 'granted' | 'denied' | 'unsupported' | 'error';

/**
 * SensorService — small shared helper for the on-device motion sensors used by
 * the Bubble Level, Compass, and Motion Lab tools.
 *
 * It owns the three concerns those tools would otherwise duplicate:
 *  - feature-detection of the orientation / motion APIs,
 *  - the iOS 13+ orientation and motion permission prompts,
 *  - a `secureContext` flag (the sensor APIs are gated to HTTPS / localhost).
 *
 * It deliberately does NOT own the event loop. Each tool subscribes to
 * `deviceorientation` itself and uses a short "did any reading arrive?" timeout
 * to tell "API present but no hardware" (the typical desktop case) apart from a
 * live sensor — feature detection alone can't distinguish the two because desktop
 * Chrome exposes `DeviceOrientationEvent` but never fires a populated event.
 */
@Injectable({ providedIn: 'root' })
export class SensorService {
  /** Sensors require a secure context. Browsers treat localhost as secure. */
  get secureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext === true;
  }

  get hasOrientation(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  get hasMotion(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  /** True on iOS 13+, where access must be granted from a user gesture. */
  get orientationNeedsPermission(): boolean {
    const ctor = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } })
      .DeviceOrientationEvent;
    return !!ctor && typeof ctor.requestPermission === 'function';
  }

  /** True on iOS 13+, where motion access must be granted from a user gesture. */
  get motionNeedsPermission(): boolean {
    const ctor = (window as unknown as { DeviceMotionEvent?: { requestPermission?: unknown } })
      .DeviceMotionEvent;
    return !!ctor && typeof ctor.requestPermission === 'function';
  }

  /**
   * Request orientation access.
   *
   * On iOS this MUST be called synchronously from a user gesture (a click
   * handler) or the promise rejects. On every other platform there is no prompt,
   * so we resolve `'granted'` when the API exists and `'unsupported'` otherwise.
   */
  async requestOrientation(): Promise<SensorPermission> {
    if (!this.hasOrientation) return 'unsupported';

    const ctor = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceOrientationEvent;

    if (ctor && typeof ctor.requestPermission === 'function') {
      try {
        const result = await ctor.requestPermission();
        return result === 'granted' ? 'granted' : 'denied';
      } catch {
        // Rejected when not triggered by a user gesture, or dismissed by the user.
        return 'error';
      }
    }
    return 'granted';
  }

  /** Request accelerometer and rotation-rate access where the browser requires it. */
  async requestMotion(): Promise<SensorPermission> {
    if (!this.hasMotion) return 'unsupported';

    const ctor = (window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceMotionEvent;

    if (ctor && typeof ctor.requestPermission === 'function') {
      try {
        const result = await ctor.requestPermission();
        return result === 'granted' ? 'granted' : 'denied';
      } catch {
        return 'error';
      }
    }
    return 'granted';
  }
}
