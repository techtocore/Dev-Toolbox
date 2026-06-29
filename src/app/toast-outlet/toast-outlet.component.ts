import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Toast, ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: false,
  templateUrl: './toast-outlet.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './toast-outlet.component.scss',
})
export class ToastOutletComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub: Subscription | null = null;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toasts$.subscribe(toast => {
      this.toasts = [...this.toasts, toast];
      const lifeMs = toast.durationMs;
      setTimeout(() => this.dismiss(toast.id), lifeMs);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  iconFor(kind: Toast['kind']): string {
    switch (kind) {
      case 'success': return 'bi-check-circle-fill';
      case 'error':   return 'bi-x-circle-fill';
      case 'warning': return 'bi-exclamation-triangle-fill';
      default:        return 'bi-info-circle-fill';
    }
  }
}
