import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts$ = new Subject<Toast>();
  readonly toasts$ = this._toasts$.asObservable();

  private nextId = 1;

  show(message: string, kind: ToastKind = 'info', durationMs = 2500): void {
    this._toasts$.next({ id: this.nextId++, kind, message, durationMs });
  }

  success(message: string, durationMs = 2000): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 4000): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = 2500): void {
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs = 3500): void {
    this.show(message, 'warning', durationMs);
  }
}
