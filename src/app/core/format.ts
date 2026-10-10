import type { Lang } from './models';

const locale = (lang: Lang) => (lang === 'es' ? 'es-ES' : 'en-US');

export function formatNumber(value: number, lang: Lang, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits }).format(value);
}

export function formatCompact(value: number, lang: Lang): string {
  return new Intl.NumberFormat(locale(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** 45 s · 12 min · 3 h 20 min */
export function formatDuration(ms: number, lang: Lang): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${formatNumber(hours, lang, 0)} h ${minutes} min` : `${formatNumber(hours, lang, 0)} h`;
}

export function formatDate(value: string | Date, lang: Lang, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'medium'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(locale(lang), options).format(date);
}

export function relativeTime(value: string | Date, lang: Lang): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale(lang), { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(0, 'minute');
}

/** Axis label for a period returned by the stats API ("YYYY-MM-DD"). */
export function formatPeriod(period: string, unit: 'day' | 'week' | 'month', lang: Lang): string {
  const [year, month, day] = period.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const options: Intl.DateTimeFormatOptions =
    unit === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(locale(lang), options).format(date);
}

/** "2025-03" -> "mar 25" */
export function formatYearMonth(period: string, lang: Lang): string {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(lang), { month: 'short', year: '2-digit' }).format(new Date(year, month - 1, 1));
}

export function countryName(code: string, fallback: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function signedPercent(value: number, lang: Lang): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value, lang)}%`;
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
