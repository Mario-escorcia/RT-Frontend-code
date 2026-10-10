import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Eye, EyeOff } from 'lucide';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import { Icon } from '../../ui/icon';

/** Password input with a show/hide toggle. */
@Component({
  selector: 'app-password-field',
  imports: [FormsModule, Icon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <input
        [id]="inputId()"
        [name]="inputId()"
        [type]="visible() ? 'text' : 'password'"
        [autocomplete]="autocomplete()"
        [placeholder]="placeholder()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        class="field-input pr-11"
      />
      <button
        type="button"
        class="absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        [attr.aria-label]="(visible() ? 'auth.hidePassword' : 'auth.showPassword') | t"
        [attr.aria-pressed]="visible()"
        (click)="visible.update((value) => !value)"
      >
        <svg appIcon [icon]="visible() ? icons.EyeOff : icons.Eye" class="size-4"></svg>
      </button>
    </div>
  `,
})
export class PasswordField {
  readonly value = model.required<string>();
  readonly inputId = input.required<string>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly placeholder = input('');
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly visible = signal(false);
  protected readonly icons = { Eye, EyeOff };
}
