import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface ContrastResult {
  ratio: number;
  ratioLabel: string;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

@Component({
  selector: 'app-color-converter',
  standalone: false,
  templateUrl: './color-converter.html',
  styleUrl: './color-converter.scss',
})
export class ColorConverter implements OnInit {
  hexInput = '#3498db';
  rgbR = 52;
  rgbG = 152;
  rgbB = 219;
  hslH = 204;
  hslS = 70;
  hslL = 53;

  // For contrast checker
  contrastAgainst = '#ffffff';

  isMobile = false;

  presets: string[] = [
    '#017cad', '#017cad', '#198754', '#dc3545', '#ffc107',
    '#0dcaf0', '#6f42c1', '#fd7e14', '#212529', '#ffffff'
  ];

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  onHexChange(): void {
    const hex = this.hexInput.replace('#', '');
    if (hex.length === 6 && /^[0-9A-Fa-f]{6}$/.test(hex)) {
      const rgb = this.hexToRgb(this.hexInput)!;
      this.rgbR = rgb.r;
      this.rgbG = rgb.g;
      this.rgbB = rgb.b;
      this.updateHslFromRgb();
    } else if (hex.length === 3 && /^[0-9A-Fa-f]{3}$/.test(hex)) {
      // Expand shorthand.
      this.hexInput = '#' + hex.split('').map(c => c + c).join('');
      this.onHexChange();
    }
  }

  onRgbChange(): void {
    this.rgbR = this.clamp(this.rgbR, 0, 255);
    this.rgbG = this.clamp(this.rgbG, 0, 255);
    this.rgbB = this.clamp(this.rgbB, 0, 255);
    this.hexInput = this.rgbToHex(this.rgbR, this.rgbG, this.rgbB);
    this.updateHslFromRgb();
  }

  onHslChange(): void {
    this.hslH = this.clamp(this.hslH, 0, 360);
    this.hslS = this.clamp(this.hslS, 0, 100);
    this.hslL = this.clamp(this.hslL, 0, 100);
    const rgb = this.hslToRgb(this.hslH, this.hslS, this.hslL);
    this.rgbR = rgb.r;
    this.rgbG = rgb.g;
    this.rgbB = rgb.b;
    this.hexInput = this.rgbToHex(this.rgbR, this.rgbG, this.rgbB);
  }

  pickPreset(hex: string): void {
    this.hexInput = hex;
    this.onHexChange();
  }

  randomColor(): void {
    const r = () => Math.floor(Math.random() * 256);
    this.hexInput = this.rgbToHex(r(), r(), r());
    this.onHexChange();
  }

  private clamp(n: number, min: number, max: number): number {
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  updateHslFromRgb(): void {
    const hsl = this.rgbToHsl(this.rgbR, this.rgbG, this.rgbB);
    this.hslH = hsl.h;
    this.hslS = hsl.s;
    this.hslL = hsl.l;
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  // ------ HSV (computed) ------
  get hsv(): { h: number; s: number; v: number } {
    const r = this.rgbR / 255, g = this.rgbG / 255, b = this.rgbB / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return {
      h: Math.round(h * 360),
      s: Math.round((max === 0 ? 0 : d / max) * 100),
      v: Math.round(max * 100)
    };
  }

  // ------ CMYK (computed) ------
  get cmyk(): { c: number; m: number; y: number; k: number } {
    const r = this.rgbR / 255, g = this.rgbG / 255, b = this.rgbB / 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: Math.round(((1 - r - k) / (1 - k)) * 100),
      m: Math.round(((1 - g - k) / (1 - k)) * 100),
      y: Math.round(((1 - b - k) / (1 - k)) * 100),
      k: Math.round(k * 100)
    };
  }

  // ------ WCAG contrast ------
  private relativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const norm = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * norm(rgb.r) + 0.7152 * norm(rgb.g) + 0.0722 * norm(rgb.b);
  }

  get contrast(): ContrastResult | null {
    const fg = this.hexToRgb(this.hexInput);
    const bg = this.hexToRgb(this.contrastAgainst);
    if (!fg || !bg) return null;
    const L1 = Math.max(this.relativeLuminance(fg), this.relativeLuminance(bg));
    const L2 = Math.min(this.relativeLuminance(fg), this.relativeLuminance(bg));
    const ratio = (L1 + 0.05) / (L2 + 0.05);
    return {
      ratio,
      ratioLabel: `${ratio.toFixed(2)} : 1`,
      aaLarge: ratio >= 3,
      aaNormal: ratio >= 4.5,
      aaaLarge: ratio >= 4.5,
      aaaNormal: ratio >= 7
    };
  }

  get cssString(): string {
    return `color: ${this.hexInput.toLowerCase()};
background: rgb(${this.rgbR}, ${this.rgbG}, ${this.rgbB});
/* hsl(${this.hslH}, ${this.hslS}%, ${this.hslL}%) */`;
  }

  copy(value: string, label?: string): void {
    this.utilityService.copyToClipboard(value, { label: label ? `${label} copied` : undefined });
  }

  swapContrast(): void {
    const tmp = this.contrastAgainst;
    this.contrastAgainst = this.hexInput;
    this.hexInput = tmp;
    this.onHexChange();
  }
}
