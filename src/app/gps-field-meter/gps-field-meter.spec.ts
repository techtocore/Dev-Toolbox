import { NgZone } from '@angular/core';
import { GpsFieldMeter } from './gps-field-meter';
import { UtilityService } from '../services/utility.service';

describe('GpsFieldMeter', () => {
  let component: GpsFieldMeter;
  let geolocation: jasmine.SpyObj<Geolocation>;
  let successHandler: PositionCallback;
  let errorHandler: PositionErrorCallback;
  let originalGeolocation: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    geolocation = jasmine.createSpyObj<Geolocation>('Geolocation', ['watchPosition', 'clearWatch']);
    geolocation.watchPosition.and.callFake((success, error) => {
      successHandler = success;
      errorHandler = error ?? (() => undefined);
      return 41;
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: geolocation,
    });

    const utility = {
      copyToClipboard: jasmine.createSpy('copyToClipboard'),
    } as unknown as UtilityService;
    component = new GpsFieldMeter(utility, new NgZone({ enableLongStackTrace: false }));
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', originalGeolocation);
    } else {
      delete (navigator as unknown as { geolocation?: Geolocation }).geolocation;
    }
  });

  it('starts a high-accuracy watch and clears it when paused', () => {
    component.start();

    expect(component.status).toBe('locating');
    expect(geolocation.watchPosition).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.objectContaining({ enableHighAccuracy: true, maximumAge: 0 }),
    );

    successHandler(position({ speed: 2.5, heading: 90 }));
    expect(component.status).toBe('active');
    expect(component.speedText).toBe('9.0');
    expect(component.headingText).toBe('90\u00B0 E');

    component.stop();
    expect(geolocation.clearWatch).toHaveBeenCalledWith(41);
    expect(component.status).toBe('paused');
  });

  it('treats permission denial as a terminal watch error', () => {
    component.start();

    errorHandler(positionError(1, 'Permission denied'));

    expect(component.status).toBe('denied');
    expect(geolocation.clearWatch).toHaveBeenCalledWith(41);
  });

  it('shows an initial timeout as a retryable state', () => {
    component.start();

    errorHandler(positionError(3, 'Timed out'));

    expect(component.status).toBe('timeout');
    expect(component.errorDetail).toContain('timed out');
    expect(geolocation.clearWatch).toHaveBeenCalledWith(41);
  });

  it('keeps the last fix visible through a transient signal loss', () => {
    component.start();
    successHandler(position({ accuracy: 8 }));
    geolocation.clearWatch.calls.reset();

    errorHandler(positionError(2, 'Position unavailable'));

    expect(component.status).toBe('active');
    expect(component.warning).toContain('temporarily unavailable');
    expect(geolocation.clearWatch).not.toHaveBeenCalled();
  });

  it('accumulates movement above the accuracy noise floor and converts units', () => {
    component.start();
    successHandler(position({ latitude: 51.5, longitude: -0.12, accuracy: 5 }));
    successHandler(position({ latitude: 51.5002, longitude: -0.12, accuracy: 5 }));

    expect(component.trackDistanceMetres).toBeGreaterThan(20);
    component.setUnits('imperial');
    expect(component.distanceText).toContain('ft');
    expect(component.accuracyText).toBe('16 ft');
  });

  function position(overrides: Partial<GeolocationCoordinates> = {}): GeolocationPosition {
    return {
      coords: {
        latitude: 51.5,
        longitude: -0.12,
        accuracy: 12,
        altitude: 40,
        altitudeAccuracy: 5,
        heading: null,
        speed: null,
        ...overrides,
      },
      timestamp: 1_700_000_000_000,
    } as GeolocationPosition;
  }

  function positionError(code: number, message: string): GeolocationPositionError {
    return {
      code,
      message,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError;
  }
});