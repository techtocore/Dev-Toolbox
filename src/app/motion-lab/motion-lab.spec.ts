import { NgZone } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { MotionLab } from './motion-lab';
import { SensorService } from '../services/sensor.service';
import { UtilityService } from '../services/utility.service';

describe('MotionLab', () => {
  let component: MotionLab;
  let sensor: {
    secureContext: boolean;
    hasMotion: boolean;
    motionNeedsPermission: boolean;
    requestMotion: jasmine.Spy;
  };

  beforeEach(() => {
    sensor = {
      secureContext: true,
      hasMotion: true,
      motionNeedsPermission: false,
      requestMotion: jasmine.createSpy('requestMotion').and.resolveTo('granted'),
    };
    component = createComponent(sensor);
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('reports unsupported hardware before attempting to listen', () => {
    sensor.hasMotion = false;

    component.ngOnInit();

    expect(component.status).toBe('unsupported');
    expect(sensor.requestMotion).not.toHaveBeenCalled();
  });

  it('surfaces a denied iOS motion permission', async () => {
    sensor.motionNeedsPermission = true;
    sensor.requestMotion.and.resolveTo('denied');
    component.ngOnInit();

    await component.start();

    expect(component.status).toBe('denied');
  });

  it('times out when the API exists but no populated event arrives', fakeAsync(() => {
    component.ngOnInit();

    void component.start();
    expect(component.status).toBe('waiting');
    tick(5001);

    expect(component.status).toBe('unsupported');
  }));

  it('reads available axes, counts a shake, and ignores events while paused', async () => {
    component.ngOnInit();
    await component.start();
    setPrivateLastUiTime(component, -Infinity);

    window.dispatchEvent(createMotionEvent({
      acceleration: { x: 13, y: 2, z: 1 },
      gravity: { x: 0, y: 0, z: 9.80665 },
      rotation: { alpha: 5, beta: 10, gamma: 15 },
      interval: 20,
    }));

    expect(component.status).toBe('active');
    expect(component.hasAcceleration).toBeTrue();
    expect(component.hasGravity).toBeTrue();
    expect(component.hasRotation).toBeTrue();
    expect(component.motionMagnitude).toBeCloseTo(Math.hypot(13, 2, 1), 4);
    expect(component.gravityG).toBeCloseTo(1, 4);
    expect(component.shakeCount).toBe(1);

    component.pause();
    const frozenMagnitude = component.motionMagnitude;
    window.dispatchEvent(createMotionEvent({
      acceleration: { x: 1, y: 1, z: 1 },
      gravity: null,
      rotation: null,
      interval: 20,
    }));

    expect(component.status).toBe('paused');
    expect(component.motionMagnitude).toBe(frozenMagnitude);
  });

  it('accepts a partial payload when only gravity is exposed', async () => {
    component.ngOnInit();
    await component.start();
    setPrivateLastUiTime(component, -Infinity);

    window.dispatchEvent(createMotionEvent({
      acceleration: null,
      gravity: { x: 0, y: 4, z: 8.9 },
      rotation: null,
      interval: 16,
    }));

    expect(component.status).toBe('active');
    expect(component.hasAcceleration).toBeFalse();
    expect(component.hasGravity).toBeTrue();
    expect(component.hasRotation).toBeFalse();
  });

  function createComponent(fakeSensor: typeof sensor): MotionLab {
    const utility = {
      copyToClipboard: jasmine.createSpy('copyToClipboard'),
    } as unknown as UtilityService;
    return new MotionLab(
      utility,
      fakeSensor as unknown as SensorService,
      new NgZone({ enableLongStackTrace: false }),
    );
  }

  function setPrivateLastUiTime(target: MotionLab, value: number): void {
    (target as unknown as { lastUiAt: number }).lastUiAt = value;
  }

  function createMotionEvent(values: {
    acceleration: { x: number; y: number; z: number } | null;
    gravity: { x: number; y: number; z: number } | null;
    rotation: { alpha: number; beta: number; gamma: number } | null;
    interval: number;
  }): DeviceMotionEvent {
    const event = new Event('devicemotion');
    Object.defineProperties(event, {
      acceleration: { value: values.acceleration },
      accelerationIncludingGravity: { value: values.gravity },
      rotationRate: { value: values.rotation },
      interval: { value: values.interval },
    });
    return event as DeviceMotionEvent;
  }
});