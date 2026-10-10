import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  action?: { label: string; run: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(toast: Omit<Toast, 'id'>, durationMs = 4500) {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-3), { ...toast, id }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(title: string, description?: string, action?: Toast['action']) {
    this.show({ kind: 'success', title, description, action });
  }

  error(title: string, description?: string) {
    this.show({ kind: 'error', title, description }, 6000);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
