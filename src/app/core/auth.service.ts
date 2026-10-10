import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_URL } from './api.service';
import type { User } from './models';
import { DataSync, ResearchStore } from './research.store';

/** Session state. The session itself lives in an httpOnly cookie the browser sends automatically. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly store = inject(ResearchStore);
  private readonly sync = inject(DataSync);

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly registrationOpen = signal(true);
  readonly firstName = computed(() => this.user()?.name.trim().split(/\s+/)[0] ?? '');
  readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  /** Runs once before the app renders (provideAppInitializer). */
  async init(): Promise<void> {
    const [me, config] = await Promise.allSettled([
      firstValueFrom(this.http.get<User>(`${API_URL}/auth/me`)),
      firstValueFrom(this.http.get<{ registrationOpen: boolean }>(`${API_URL}/auth/config`)),
    ]);
    this.user.set(me.status === 'fulfilled' ? me.value : null);
    if (config.status === 'fulfilled') this.registrationOpen.set(config.value.registrationOpen);
  }

  async login(email: string, password: string): Promise<void> {
    this.startSession(await firstValueFrom(this.http.post<User>(`${API_URL}/auth/login`, { email, password })));
  }

  async register(name: string, email: string, password: string): Promise<void> {
    this.startSession(await firstValueFrom(this.http.post<User>(`${API_URL}/auth/register`, { name, email, password })));
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, {}));
    } catch {
      /* the session is dropped locally anyway */
    }
    this.endSession();
    await this.router.navigate(['/login']);
  }

  /** Called when the API answers 401 (expired or revoked session). */
  handleUnauthorized(): void {
    if (!this.user()) return;
    const returnUrl = this.router.url;
    this.endSession();
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  private startSession(user: User) {
    this.store.reset();
    this.user.set(user);
    this.sync.bump();
  }

  private endSession() {
    this.store.reset();
    this.user.set(null);
  }
}

/** Only same-app paths are accepted as post-login destinations (no open redirects). */
export function safeReturnUrl(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') && !value.startsWith('/register')
    ? value
    : '/';
}

export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: state.url !== '/' ? { returnUrl: state.url } : {} });
};

export const guestGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;

/** Sends the session cookie to the API (also cross-origin) and reacts to expired sessions. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url.startsWith(API_URL);
  if (!isApi) return next(req);
  const auth = inject(AuthService);
  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/auth/')) {
        auth.handleUnauthorized();
      }
      return throwError(() => error);
    }),
  );
};
