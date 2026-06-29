import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { UtilityService } from '../services/utility.service';

type MeterStatus = 'idle' | 'running' | 'denied' | 'nomic' | 'insecure' | 'error';

// dBFS window the meter bar maps across. -60 dBFS reads empty, 0 dBFS (digital
// full-scale) reads full.
const FLOOR_DBFS = -60;
// How often the numeric read-outs refresh (frames). The canvas still redraws
// every frame; only the Angular-bound text is throttled to ~10 Hz.
const READOUT_EVERY = 6;

@Component({
  selector: 'app-sound-meter',
  standalone: false,
  templateUrl: './sound-meter.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sound-meter.scss',
})
export class SoundMeter implements AfterViewInit, OnDestroy {
  @ViewChild('scope') scopeRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('liveHeading') liveHeadingRef?: ElementRef<HTMLElement>;

  status: MeterStatus = 'idle';
  errorDetail = '';

  // Live read-outs (estimated dB SPL = dBFS + calibration offset).
  estDb = 0;
  levelPct = 0;
  minDb = 0;
  maxDb = 0;
  avgDb = 0;

  /** Throttled text for the screen-reader live region (~1 Hz, or on band change). */
  announce = '';
  private lastAnnounceMs = 0;
  private lastBand = '';
  /** Synchronous re-entrancy guard so a double-tap can't open two mic streams. */
  private starting = false;

  /**
   * Microphones report a relative level (dBFS), not absolute loudness. This
   * offset shifts it into a plausible dB-SPL range; it's a rough guide, not a
   * calibrated measurement.
   */
  calibrationOffset = 90;

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private buffer: Float32Array = new Float32Array(0);
  private rafId: number | null = null;

  // Accumulated stats (updated every frame, off the change-detection path).
  private sum = 0;
  private count = 0;
  private accMin = Infinity;
  private accMax = -Infinity;
  private frame = 0;
  private history: number[] = [];

  private cssW = 0;
  private cssH = 0;

  constructor(
    public utilityService: UtilityService,
    private zone: NgZone,
  ) {}

  get supported(): boolean {
    return typeof navigator !== 'undefined'
      && !!navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function';
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      this.status = 'insecure';
    } else if (!this.supported) {
      this.status = 'error';
      this.errorDetail = 'This browser does not expose microphone capture.';
    }
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  async start(): Promise<void> {
    // `starting` is set synchronously before the first await, so a rapid second
    // tap during the (seconds-long) permission prompt can't open a second stream.
    if (this.starting || this.status === 'running') return;
    this.starting = true;
    try {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch (err) {
        this.classifyError(err);
        return;
      }

      const Ctx = window.AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        this.status = 'error';
        this.errorDetail = 'Web Audio is unavailable in this browser.';
        this.stopStream();
        return;
      }

      this.audioCtx = new Ctx();
      // Some browsers start the context suspended until a gesture resumes it.
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume().catch(() => undefined);
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0;
      this.buffer = new Float32Array(this.analyser.fftSize);

      // iOS Safari before 14.5 exposes AnalyserNode but not the float time-domain
      // reader; guard here so the meter loop can't throw on its first frame and
      // strand the UI on a frozen "running" card. Surfaces the existing error card.
      if (typeof this.analyser.getFloatTimeDomainData !== 'function') {
        this.status = 'error';
        this.errorDetail = 'This browser lacks the audio analysis API needed by the meter.';
        this.teardown();
        return;
      }

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.reset();
      this.status = 'running';

      // Run the meter loop outside Angular so 60fps canvas redraws don't trigger
      // change detection; we re-enter the zone only to push the throttled numbers.
      // The canvas is rendered by an @if that only resolves on the next change
      // detection pass, so wait for it to exist and be laid out before sizing.
      window.addEventListener('resize', this.onResize);
      this.zone.runOutsideAngular(() => this.beginLoopWhenReady());

      // Move focus into the now-active region so keyboard / screen-reader users
      // aren't dropped to <body> when the Start button's block is removed.
      setTimeout(() => this.liveHeadingRef?.nativeElement.focus(), 0);
    } finally {
      this.starting = false;
    }
  }

  private beginLoopWhenReady(attempt = 0): void {
    const canvas = this.scopeRef?.nativeElement;
    if ((!canvas || canvas.clientWidth === 0) && attempt < 20) {
      // Track the handle so a teardown/stop during the warm-up window cancels it.
      this.rafId = requestAnimationFrame(() => this.beginLoopWhenReady(attempt + 1));
      return;
    }
    this.sizeCanvas();
    this.loop();
  }

  private readonly onResize = (): void => this.sizeCanvas();

  stop(): void {
    this.teardown();
    this.status = 'idle';
  }

  reset(): void {
    this.sum = 0;
    this.count = 0;
    this.accMin = Infinity;
    this.accMax = -Infinity;
    // Restart the frame counter so the next loop iteration is frame 0 and
    // immediately refreshes the bound read-outs (frame % READOUT_EVERY === 0).
    this.frame = 0;
    this.history = [];
    this.estDb = 0;
    this.levelPct = 0;
    this.minDb = 0;
    this.maxDb = 0;
    this.avgDb = 0;
    this.announce = '';
    this.lastBand = '';
    this.lastAnnounceMs = 0;
  }

  get meterClass(): string {
    if (this.estDb >= 85) return 'meter-danger';
    if (this.estDb >= 70) return 'meter-warn';
    return 'meter-ok';
  }

  /** Non-colour text cue for the level band (WCAG 1.4.1 — colour isn't the only signal). */
  get meterLabel(): string {
    if (this.estDb >= 85) return 'Loud — hearing risk';
    if (this.estDb >= 70) return 'Moderate';
    return 'Quiet';
  }

  private loop = (): void => {
    if (!this.analyser) return;

    // getFloatTimeDomainData typing across TS lib versions is finicky; the cast
    // keeps it portable without changing runtime behaviour.
    this.analyser.getFloatTimeDomainData(this.buffer as unknown as Float32Array<ArrayBuffer>);

    let sumSquares = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const v = this.buffer[i];
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / this.buffer.length);
    const dbfs = rms > 0 ? 20 * Math.log10(rms) : FLOOR_DBFS;

    const pct = Math.max(0, Math.min(100, ((dbfs - FLOOR_DBFS) / -FLOOR_DBFS) * 100));

    // Accumulate the raw RMS dBFS, not the calibrated value, so moving the
    // calibration slider mid-session re-derives Min/Avg/Peak consistently with
    // the live reading (the offset + 0-clamp are applied only at display time).
    this.sum += dbfs;
    this.count++;
    if (dbfs < this.accMin) this.accMin = dbfs;
    if (dbfs > this.accMax) this.accMax = dbfs;

    this.history.push(pct);
    this.drawScope();

    if (this.frame++ % READOUT_EVERY === 0) {
      // Apply the calibration offset (and the 0-clamp) only here, at display
      // time. Adding a constant and clamping at 0 are monotonic, so Min/Avg/Peak
      // stay mutually consistent and update the instant the slider moves.
      const est = Math.max(0, dbfs + this.calibrationOffset);
      const avg = this.count > 0 ? Math.max(0, this.sum / this.count + this.calibrationOffset) : 0;
      const band = est >= 85 ? 'loud' : est >= 70 ? 'moderate' : 'quiet';
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      this.zone.run(() => {
        this.estDb = est;
        this.levelPct = pct;
        this.minDb = this.accMin === Infinity ? 0 : Math.max(0, this.accMin + this.calibrationOffset);
        this.maxDb = this.accMax === -Infinity ? 0 : Math.max(0, this.accMax + this.calibrationOffset);
        this.avgDb = avg;
        // Refresh the live region only on a band change or ~once a second, so a
        // screen reader isn't flooded by the 10 Hz numeric updates.
        if (band !== this.lastBand || now - this.lastAnnounceMs >= 1000) {
          this.lastBand = band;
          this.lastAnnounceMs = now;
          this.announce = `${Math.round(est)} decibels SPL, ${band}`;
        }
      });
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private drawScope(): void {
    const canvas = this.scopeRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = this.cssW;
    const h = this.cssH;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);

    const barW = 3;
    const cols = Math.max(1, Math.floor(w / barW));
    if (this.history.length > cols) {
      this.history.splice(0, this.history.length - cols);
    }

    for (let i = 0; i < this.history.length; i++) {
      const value = this.history[i];
      const barH = (value / 100) * h;
      ctx.fillStyle = value >= 92 ? '#dc3545' : value >= 75 ? '#fd7e14' : '#017cad';
      ctx.fillRect(i * barW, h - barH, barW - 1, barH);
    }
  }

  private sizeCanvas(): void {
    const canvas = this.scopeRef?.nativeElement;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.cssW = canvas.clientWidth || 320;
    this.cssH = canvas.clientHeight || 120;
    canvas.width = Math.round(this.cssW * dpr);
    canvas.height = Math.round(this.cssH * dpr);
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private classifyError(err: unknown): void {
    const name = (err as { name?: string })?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
      this.status = 'denied';
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      this.status = 'nomic';
    } else {
      this.status = 'error';
      this.errorDetail = (err as { message?: string })?.message || 'Could not start the microphone.';
    }
    this.stopStream();
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private teardown(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize);
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    try {
      this.source?.disconnect();
    } catch {
      // already disconnected
    }
    this.source = null;
    this.analyser = null;
    this.stopStream();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => undefined);
    }
    this.audioCtx = null;
  }
}
