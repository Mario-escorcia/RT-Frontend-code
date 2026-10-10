import { DOCUMENT } from '@angular/common';
import { Injectable, Pipe, PipeTransform, computed, effect, inject, signal } from '@angular/core';
import type { Lang } from '../models';
import { en } from './en';
import { es, type Dictionary } from './es';

const STORAGE_KEY = 'kh.lang';
const DICTIONARIES: Record<Lang, Dictionary> = { es, en };

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

type Params = Record<string, string | number>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<Lang>(initialLang());
  readonly locale = computed(() => (this.lang() === 'es' ? 'es-ES' : 'en-US'));

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.document.documentElement.lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* storage unavailable */
      }
    });
  }

  set(lang: Lang) {
    this.lang.set(lang);
  }

  toggle() {
    this.lang.update((lang) => (lang === 'es' ? 'en' : 'es'));
  }

  /**
   * Translates a dotted key, e.g. t('dashboard.title') or t('common.sourcesCount', { n: 3 }).
   * "singular|plural" values pick a form from the numeric `n` param.
   */
  t(key: string, params?: Params): string {
    const value = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], DICTIONARIES[this.lang()]);
    if (typeof value !== 'string') return key;
    let text = value;
    if (text.includes('|')) {
      const [singular, plural] = text.split('|');
      text = Number(params?.['n']) === 1 ? singular : plural;
    }
    return params ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? '')) : text;
  }

  /** Like t() but returns undefined when the key does not exist (for open sets like API enums). */
  maybe(key: string): string | undefined {
    const value = this.t(key);
    return value === key ? undefined : value;
  }
}

/** `{{ 'nav.dashboard' | t }}` — impure so it re-renders when the language signal changes. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: Params): string {
    return this.i18n.t(key, params);
  }
}
