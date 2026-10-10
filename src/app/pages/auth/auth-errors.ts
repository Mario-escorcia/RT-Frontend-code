import { HttpErrorResponse } from '@angular/common/http';

/** Maps an API error to an i18n key under auth.errors. */
export function authErrorKey(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0 || error.status >= 502) return 'auth.errors.network';
    const code = (error.error as { error?: string } | null)?.error;
    if (code === 'invalid_credentials' || code === 'email_taken' || code === 'rate_limited' || code === 'registration_closed') {
      return `auth.errors.${code}`;
    }
    if (code === 'validation_error') return 'auth.errors.validation';
  }
  return 'errors.generic';
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
