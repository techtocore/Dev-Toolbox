import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly _toggle$ = new Subject<void>();
  readonly toggle$ = this._toggle$.asObservable();

  open(): void {
    this._toggle$.next();
  }
}
