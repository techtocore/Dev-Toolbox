import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly _open$ = new Subject<void>();
  readonly open$ = this._open$.asObservable();

  open(): void {
    this._open$.next();
  }
}
