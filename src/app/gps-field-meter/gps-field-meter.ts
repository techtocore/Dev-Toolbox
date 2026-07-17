import {
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { UtilityService } from '../services/utility.service';

type GpsStatus =
  | 'idle'
  | 'locating'
  | 'active'
  | 'paused'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'
  | 'insecure'
  | 'error';

type MeasurementUnits = 'metric' | 'imperial';

interface TrackPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const METRES_TO_FEET = 3.28084;
const METRES_TO_MILES = 0.000621371;
const MPS_TO_KMH = 3.6;
const MPS_TO_MPH = 2.23694;
const EARTH_RADIUS_METRES = 6_371_000;

const CARDINALS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

@Component({
  selector: 'app-gps-field-meter',
  standalone: false,
  templateUrl: './gps-field-meter.html',
  styleUrl: './gps-field-meter.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GpsFieldMeter implements OnInit, OnDestroy {
  status: GpsStatus = 'idle';
  units: MeasurementUnits = 'metric';
  highAccuracy = true;
  errorDetail = '';
  warning = '';
  pageUrl = '';

  hasFix = false;
  latitude = 0;
  longitude = 0;
  accuracy = 0;
  altitude: number | null = null;
  altitudeAccuracy: number | null = null;
  speed: number | null = null;
  heading: number | null = null;
  fixTimestamp = 0;
  fixCount = 0;
  trackDistanceMetres = 0;
  maxSpeedMps = 0;
  announcement = '';

  private watchId: number | null = null;
  private lastTrackPoint: TrackPoint | null = null;

  constructor(
    public utilityService: UtilityService,
    private zone: NgZone,
  ) {}

  get supported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  ngOnInit(): void {
    this.pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof window === 'undefined' || !window.isSecureContext) {
      this.status = 'insecure';
    } else if (!this.supported) {
      this.status = 'unsupported';
    }
  }

  ngOnDestroy(): void {
    this.clearWatch();
  }

  start(): void {
    if (!this.supported || this.status === 'locating' || this.status === 'active') return;

    this.clearWatch();
    this.errorDetail = '';
    this.warning = '';
    this.status = 'locating';

    try {
      this.watchId = navigator.geolocation.watchPosition(
        this.onPosition,
        this.onPositionError,
        {
          enableHighAccuracy: this.highAccuracy,
          maximumAge: this.highAccuracy ? 0 : 30_000,
          timeout: this.highAccuracy ? 20_000 : 12_000,
        },
      );
    } catch (error) {
      this.status = 'error';
      this.errorDetail = error instanceof Error
        ? error.message
        : 'The browser could not start its location service.';
    }
  }

  stop(): void {
    this.clearWatch();
    this.status = this.hasFix ? 'paused' : 'idle';
    this.announcement = this.hasFix ? 'GPS tracking paused.' : 'GPS request cancelled.';
  }

  retry(): void {
    this.start();
  }

  resetTrack(): void {
    this.trackDistanceMetres = 0;
    this.fixCount = this.hasFix ? 1 : 0;
    this.maxSpeedMps = this.speed ?? 0;
    this.lastTrackPoint = this.hasFix
      ? { latitude: this.latitude, longitude: this.longitude, accuracy: this.accuracy }
      : null;
    this.announcement = 'Track statistics reset.';
  }

  dismissWarning(): void {
    this.warning = '';
  }

  setUnits(units: MeasurementUnits): void {
    this.units = units;
  }

  copyCoordinates(): void {
    const coordinates = `${this.latitude.toFixed(6)}, ${this.longitude.toFixed(6)}`;
    this.utilityService.copyToClipboard(coordinates, { label: 'Coordinates copied' });
  }

  copyUrl(): void {
    this.utilityService.copyToClipboard(this.pageUrl, { label: 'Page link copied' });
  }

  get latitudeText(): string {
    return `${Math.abs(this.latitude).toFixed(6)}\u00B0 ${this.latitude >= 0 ? 'N' : 'S'}`;
  }

  get longitudeText(): string {
    return `${Math.abs(this.longitude).toFixed(6)}\u00B0 ${this.longitude >= 0 ? 'E' : 'W'}`;
  }

  get accuracyText(): string {
    if (this.units === 'imperial') return `${Math.round(this.accuracy * METRES_TO_FEET)} ft`;
    return `${Math.round(this.accuracy)} m`;
  }

  get altitudeText(): string {
    if (this.altitude === null) return '--';
    if (this.units === 'imperial') return `${Math.round(this.altitude * METRES_TO_FEET)} ft`;
    return `${Math.round(this.altitude)} m`;
  }

  get altitudeAccuracyText(): string {
    if (this.altitudeAccuracy === null) return '';
    if (this.units === 'imperial') {
      return `\u00B1${Math.round(this.altitudeAccuracy * METRES_TO_FEET)} ft`;
    }
    return `\u00B1${Math.round(this.altitudeAccuracy)} m`;
  }

  get speedText(): string {
    if (this.speed === null) return '--';
    const value = this.units === 'imperial' ? this.speed * MPS_TO_MPH : this.speed * MPS_TO_KMH;
    return value.toFixed(value < 10 ? 1 : 0);
  }

  get speedUnit(): string {
    return this.units === 'imperial' ? 'mph' : 'km/h';
  }

  get maxSpeedText(): string {
    const value = this.units === 'imperial'
      ? this.maxSpeedMps * MPS_TO_MPH
      : this.maxSpeedMps * MPS_TO_KMH;
    return value.toFixed(value < 10 ? 1 : 0);
  }

  get distanceText(): string {
    if (this.units === 'imperial') {
      const miles = this.trackDistanceMetres * METRES_TO_MILES;
      if (miles >= 0.1) return `${miles.toFixed(2)} mi`;
      return `${Math.round(this.trackDistanceMetres * METRES_TO_FEET)} ft`;
    }
    if (this.trackDistanceMetres >= 1000) {
      return `${(this.trackDistanceMetres / 1000).toFixed(2)} km`;
    }
    return `${Math.round(this.trackDistanceMetres)} m`;
  }

  get headingText(): string {
    if (this.heading === null) return '--';
    const normalized = ((this.heading % 360) + 360) % 360;
    const cardinal = CARDINALS[Math.round(normalized / 22.5) % CARDINALS.length];
    return `${Math.round(normalized)}\u00B0 ${cardinal}`;
  }

  get headingRotation(): number {
    return this.heading ?? 0;
  }

  get accuracyLabel(): string {
    if (this.accuracy <= 10) return 'Excellent fix';
    if (this.accuracy <= 30) return 'Good fix';
    if (this.accuracy <= 100) return 'Approximate fix';
    return 'Low accuracy';
  }

  get accuracyClass(): string {
    if (this.accuracy <= 10) return 'accuracy-excellent';
    if (this.accuracy <= 30) return 'accuracy-good';
    if (this.accuracy <= 100) return 'accuracy-fair';
    return 'accuracy-low';
  }

  get accuracyDiscSize(): number {
    const scaled = 22 + Math.log10(Math.max(1, this.accuracy)) * 28;
    return Math.max(22, Math.min(86, scaled));
  }

  get lastFixText(): string {
    return this.fixTimestamp
      ? new Date(this.fixTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '--';
  }

  private readonly onPosition = (position: GeolocationPosition): void => {
    this.zone.run(() => this.applyPosition(position));
  };

  private applyPosition(position: GeolocationPosition): void {
    const { coords } = position;
    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      this.status = 'error';
      this.errorDetail = 'The browser returned an invalid location reading.';
      this.clearWatch();
      return;
    }

    const nextPoint: TrackPoint = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: Number.isFinite(coords.accuracy) ? Math.max(0, coords.accuracy) : 0,
    };

    if (this.lastTrackPoint) {
      const segment = this.distanceBetween(this.lastTrackPoint, nextPoint);
      const noiseFloor = Math.max(2, Math.min(this.lastTrackPoint.accuracy, nextPoint.accuracy) * 0.35);
      if (segment >= noiseFloor) this.trackDistanceMetres += segment;
    }

    this.latitude = nextPoint.latitude;
    this.longitude = nextPoint.longitude;
    this.accuracy = nextPoint.accuracy;
    this.altitude = this.finiteOrNull(coords.altitude);
    this.altitudeAccuracy = this.finiteOrNull(coords.altitudeAccuracy);
    this.speed = this.finiteOrNull(coords.speed, true);
    this.heading = this.finiteOrNull(coords.heading);
    this.fixTimestamp = position.timestamp || Date.now();
    this.fixCount++;
    this.maxSpeedMps = Math.max(this.maxSpeedMps, this.speed ?? 0);
    this.lastTrackPoint = nextPoint;
    this.hasFix = true;
    this.warning = '';
    this.status = 'active';
    this.announcement = `${this.accuracyLabel}. Accuracy ${this.accuracyText}.`;
  }

  private readonly onPositionError = (error: GeolocationPositionError): void => {
    this.zone.run(() => this.applyPositionError(error));
  };

  private applyPositionError(error: GeolocationPositionError): void {
    if (error.code === 1) {
      this.clearWatch();
      this.status = 'denied';
      this.errorDetail = error.message;
      return;
    }

    const unavailable = error.code === 2;
    const message = unavailable
      ? 'A position fix is temporarily unavailable. Move near a window or outdoors and try again.'
      : error.code === 3
        ? 'The location request timed out before the device found a fix.'
        : error.message || 'The browser could not read your location.';

    if (this.hasFix) {
      this.warning = message;
      this.status = 'active';
      this.announcement = 'GPS signal interrupted. The last fix remains on screen.';
      return;
    }

    this.clearWatch();
    this.errorDetail = message;
    this.status = unavailable ? 'unavailable' : error.code === 3 ? 'timeout' : 'error';
  }

  private clearWatch(): void {
    if (this.watchId !== null && this.supported) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private finiteOrNull(value: number | null, clampToZero = false): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return clampToZero ? Math.max(0, value) : value;
  }

  private distanceBetween(a: TrackPoint, b: TrackPoint): number {
    const toRadians = (degrees: number): number => degrees * Math.PI / 180;
    const latitudeDelta = toRadians(b.latitude - a.latitude);
    const longitudeDelta = toRadians(b.longitude - a.longitude);
    const latitudeA = toRadians(a.latitude);
    const latitudeB = toRadians(b.latitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
    return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(haversine));
  }
}