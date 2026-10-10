import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { CircleAlert, CircleCheck, Info, X } from 'lucide';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { UiButton } from './button';
import { Icon } from './icon';

@Component({
  selector: 'app-toaster',
  imports: [Icon, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="surface-card pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 p-4 shadow-lg shadow-black/5"
          role="status"
        >
          <svg
            appIcon
            [icon]="toast.kind === 'success' ? icons.CircleCheck : toast.kind === 'error' ? icons.CircleAlert : icons.Info"
            class="mt-0.5 size-4"
            [class.text-success]="toast.kind === 'success'"
            [class.text-destructive]="toast.kind === 'error'"
          ></svg>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">{{ toast.title }}</p>
            @if (toast.description) {
              <p class="mt-0.5 text-xs text-muted-foreground">{{ toast.description }}</p>
            }
            @if (toast.action; as action) {
              <button uiBtn variant="link" size="sm" class="mt-1 h-auto" (click)="action.run(); toasts.dismiss(toast.id)">
                {{ action.label }}
              </button>
            }
          </div>
          <button
            type="button"
            class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Close"
          >
            <svg appIcon [icon]="icons.X" class="size-3.5"></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class Toaster {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = { CircleCheck, CircleAlert, Info, X };
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      (cancel)="confirm.resolve(false)"
    >
      @if (confirm.request(); as request) {
        <div class="p-6">
          <h2 class="text-base font-semibold tracking-tight">{{ request.title }}</h2>
          <p class="mt-2 text-sm text-muted-foreground">{{ request.description }}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button uiBtn variant="outline" (click)="confirm.resolve(false)">{{ request.cancelLabel }}</button>
            <button uiBtn [variant]="request.destructive ? 'destructive' : 'default'" (click)="confirm.resolve(true)">
              {{ request.confirmLabel }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.confirm.request() && !dialog.open) dialog.showModal();
      if (!this.confirm.request() && dialog.open) dialog.close();
    });
  }
}
