import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';
import { ApiService } from './api.service';

type Refs = { eventId?: string | null; searchId?: string | null } | null;

/**
 * Measures the time a result page is actually visible and reports it as reading time.
 * Must be called in an injection context (component constructor / field initializer).
 */
export function trackReadingTime(refs: () => Refs): void {
  const api = inject(ApiService);
  const document = inject(DOCUMENT);
  let accumulated = 0;
  let visibleSince: number | null = document.visibilityState === 'visible' ? performance.now() : null;

  const pause = () => {
    if (visibleSince !== null) {
      accumulated += performance.now() - visibleSince;
      visibleSince = null;
    }
  };
  const flush = () => {
    pause();
    const current = refs();
    if (current && accumulated >= 3_000) api.logReading(accumulated, current);
    accumulated = 0;
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flush();
    else if (visibleSince === null) visibleSince = performance.now();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  inject(DestroyRef).onDestroy(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    flush();
  });
}
