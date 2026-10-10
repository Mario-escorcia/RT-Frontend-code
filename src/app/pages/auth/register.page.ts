import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoaderCircle } from 'lucide';
import { AuthService, safeReturnUrl } from '../../core/auth.service';
import { I18nService, TranslatePipe } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/toast.service';
import { UiButton } from '../../ui/button';
import { Icon } from '../../ui/icon';
import { AuthLayout } from './auth-layout';
import { EMAIL_PATTERN, authErrorKey } from './auth-errors';
import { PasswordField } from './password-field';

const MIN_PASSWORD = 8;

@Component({
  selector: 'app-register-page',
  imports: [AuthLayout, FormsModule, RouterLink, UiButton, Icon, TranslatePipe, PasswordField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h2 class="text-2xl font-semibold tracking-tight">{{ 'auth.register.title' | t }}</h2>
      <p class="mt-2 text-sm text-muted-foreground">{{ 'auth.register.subtitle' | t }}</p>

      @if (!auth.registrationOpen()) {
        <div role="alert" class="mt-6 rounded-lg border border-border bg-muted px-3.5 py-3 text-sm">
          {{ 'auth.register.closed' | t }}
        </div>
      } @else {
        @if (error()) {
          <div role="alert" class="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            {{ error()! | t }}
          </div>
        }

        <form class="mt-6 flex flex-col gap-4" novalidate (submit)="submit($event)">
          <div class="flex flex-col gap-1.5">
            <label for="name" class="text-sm font-medium">{{ 'auth.fields.name' | t }}</label>
            <input
              id="name"
              name="name"
              autocomplete="name"
              maxlength="80"
              class="field-input"
              [placeholder]="'auth.fields.namePlaceholder' | t"
              [attr.aria-invalid]="showErrors() && !!nameError()"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
            />
            @if (showErrors() && nameError(); as message) {
              <p class="text-xs text-destructive">{{ message | t }}</p>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-sm font-medium">{{ 'auth.fields.email' | t }}</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              class="field-input"
              [placeholder]="'auth.fields.emailPlaceholder' | t"
              [attr.aria-invalid]="showErrors() && !!emailError()"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
            />
            @if (showErrors() && emailError(); as message) {
              <p class="text-xs text-destructive">{{ message | t }}</p>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="password" class="text-sm font-medium">{{ 'auth.fields.password' | t }}</label>
            <app-password-field
              inputId="password"
              autocomplete="new-password"
              [placeholder]="'auth.fields.newPasswordPlaceholder' | t"
              [invalid]="showErrors() && !!passwordError()"
              describedBy="password-hint"
              [(value)]="password"
            />
            <div class="mt-1 flex gap-1" aria-hidden="true">
              @for (segment of [1, 2, 3, 4]; track segment) {
                <span
                  class="h-1 flex-1 rounded-full transition-colors"
                  [class]="segment <= strength() ? 'bg-foreground' : 'bg-muted'"
                ></span>
              }
            </div>
            <p id="password-hint" class="text-xs" [class]="showErrors() && passwordError() ? 'text-destructive' : 'text-muted-foreground'">
              @if (password()) {
                {{ 'auth.strength.' + strengthLabel() | t }} ·
              }
              {{ (showErrors() && passwordError() ? passwordError()! : 'auth.passwordHint') | t: { n: minPassword } }}
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="confirm" class="text-sm font-medium">{{ 'auth.fields.confirmPassword' | t }}</label>
            <app-password-field
              inputId="confirm"
              autocomplete="new-password"
              [invalid]="showErrors() && !!confirmError()"
              [(value)]="confirm"
            />
            @if (showErrors() && confirmError(); as message) {
              <p class="text-xs text-destructive">{{ message | t }}</p>
            }
          </div>

          <button uiBtn size="lg" type="submit" class="mt-2 w-full" [disabled]="submitting()">
            @if (submitting()) {
              <svg appIcon [icon]="icons.LoaderCircle" class="size-4 animate-spin"></svg>
            }
            {{ 'auth.register.submit' | t }}
          </button>
        </form>
      }

      <p class="mt-8 text-center text-sm text-muted-foreground">
        {{ 'auth.register.haveAccount' | t }}
        <a
          routerLink="/login"
          [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : {}"
          class="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {{ 'auth.register.signIn' | t }}
        </a>
      </p>
    </app-auth-layout>
  `,
})
export class RegisterPage {
  readonly returnUrl = input<string>();

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  protected readonly icons = { LoaderCircle };
  protected readonly minPassword = MIN_PASSWORD;
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly submitting = signal(false);
  protected readonly showErrors = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly nameError = computed(() => (this.name().trim() ? null : 'auth.errors.required'));
  protected readonly emailError = computed(() => {
    const value = this.email().trim();
    if (!value) return 'auth.errors.required';
    return EMAIL_PATTERN.test(value) ? null : 'auth.errors.emailInvalid';
  });
  protected readonly passwordError = computed(() =>
    this.password().length >= MIN_PASSWORD ? null : 'auth.errors.passwordShort',
  );
  protected readonly confirmError = computed(() =>
    this.confirm() === this.password() ? null : 'auth.errors.passwordMismatch',
  );

  /** 0-4: length, longer length, mixed case, digits/symbols. */
  protected readonly strength = computed(() => {
    const value = this.password();
    if (!value) return 0;
    let score = 0;
    if (value.length >= MIN_PASSWORD) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.max(1, score);
  });
  protected readonly strengthLabel = computed(() => ['weak', 'weak', 'fair', 'good', 'strong'][this.strength()]);

  protected async submit(event: Event) {
    event.preventDefault();
    this.showErrors.set(true);
    this.error.set(null);
    if (this.nameError() || this.emailError() || this.passwordError() || this.confirmError() || this.submitting()) return;

    this.submitting.set(true);
    try {
      await this.auth.register(this.name().trim(), this.email().trim(), this.password());
      this.toast.success(this.i18n.t('auth.welcome', { name: this.auth.firstName() }));
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.error.set(authErrorKey(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
