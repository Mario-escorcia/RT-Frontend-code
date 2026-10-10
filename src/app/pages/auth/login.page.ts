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

@Component({
  selector: 'app-login-page',
  imports: [AuthLayout, FormsModule, RouterLink, UiButton, Icon, TranslatePipe, PasswordField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h2 class="text-2xl font-semibold tracking-tight">{{ 'auth.login.title' | t }}</h2>
      <p class="mt-2 text-sm text-muted-foreground">{{ 'auth.login.subtitle' | t }}</p>

      @if (error()) {
        <div role="alert" class="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {{ error()! | t }}
        </div>
      }

      <form class="mt-6 flex flex-col gap-4" novalidate (submit)="submit($event)">
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
            [attr.aria-describedby]="showErrors() && emailError() ? 'email-error' : null"
            [ngModel]="email()"
            (ngModelChange)="email.set($event)"
          />
          @if (showErrors() && emailError(); as message) {
            <p id="email-error" class="text-xs text-destructive">{{ message | t }}</p>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="password" class="text-sm font-medium">{{ 'auth.fields.password' | t }}</label>
          <app-password-field
            inputId="password"
            autocomplete="current-password"
            [placeholder]="'auth.fields.passwordPlaceholder' | t"
            [invalid]="showErrors() && !password()"
            [describedBy]="showErrors() && !password() ? 'password-error' : null"
            [(value)]="password"
          />
          @if (showErrors() && !password()) {
            <p id="password-error" class="text-xs text-destructive">{{ 'auth.errors.required' | t }}</p>
          }
        </div>

        <button uiBtn size="lg" type="submit" class="mt-2 w-full" [disabled]="submitting()">
          @if (submitting()) {
            <svg appIcon [icon]="icons.LoaderCircle" class="size-4 animate-spin"></svg>
          }
          {{ 'auth.login.submit' | t }}
        </button>
      </form>

      @if (auth.registrationOpen()) {
        <p class="mt-8 text-center text-sm text-muted-foreground">
          {{ 'auth.login.noAccount' | t }}
          <a
            routerLink="/register"
            [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : {}"
            class="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {{ 'auth.login.createAccount' | t }}
          </a>
        </p>
      }
    </app-auth-layout>
  `,
})
export class LoginPage {
  /** ?returnUrl= query param (router input binding). */
  readonly returnUrl = input<string>();

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  protected readonly icons = { LoaderCircle };
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly showErrors = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly emailError = computed(() => {
    const value = this.email().trim();
    if (!value) return 'auth.errors.required';
    return EMAIL_PATTERN.test(value) ? null : 'auth.errors.emailInvalid';
  });

  protected async submit(event: Event) {
    event.preventDefault();
    this.showErrors.set(true);
    this.error.set(null);
    if (this.emailError() || !this.password() || this.submitting()) return;

    this.submitting.set(true);
    try {
      await this.auth.login(this.email().trim(), this.password());
      this.toast.success(this.i18n.t('auth.welcomeBack', { name: this.auth.firstName() }));
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.error.set(authErrorKey(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
