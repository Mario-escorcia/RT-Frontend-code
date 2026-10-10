import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'kh.theme';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);

  readonly preference = signal<ThemePreference>(readPreference());
  readonly isDark = computed(() =>
    this.preference() === 'system' ? this.systemDark() : this.preference() === 'dark',
  );

  constructor() {
    this.media.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => {
      const dark = this.isDark();
      this.document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem(STORAGE_KEY, this.preference());
      } catch {
        /* storage unavailable */
      }
    });
  }

  set(preference: ThemePreference) {
    this.preference.set(preference);
  }

  /** Cycles light -> dark -> system. */
  toggle() {
    const order: ThemePreference[] = ['light', 'dark', 'system'];
    this.preference.update((current) => order[(order.indexOf(current) + 1) % order.length]);
  }
}
