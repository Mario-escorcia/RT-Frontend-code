import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  ask(request: ConfirmRequest): Promise<boolean> {
    this.resolver?.(false);
    this.request.set(request);
    return new Promise((resolve) => (this.resolver = resolve));
  }

  resolve(value: boolean) {
    this.resolver?.(value);
    this.resolver = null;
    this.request.set(null);
  }
}
