import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  type ChartDataset,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { formatCompact, formatDuration, formatNumber } from '../core/format';
import { I18nService } from '../core/i18n/i18n.service';
import type { ChartType, Lang } from '../core/models';
import { ThemeService } from '../core/theme.service';

Chart.register(
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);
Chart.defaults.font.family = "'Geist', ui-sans-serif, system-ui, sans-serif";

export type ValueFormat = 'number' | 'compact' | 'duration';

export interface ChartInput {
  type: ChartType;
  labels: string[];
  series: { name: string; data: (number | null)[] }[];
  unit?: string | null;
  format?: ValueFormat;
}

const MAX_SLICES = 6;
const MAX_SERIES = 6;

export function formatChartValue(value: number | null, data: ChartInput, lang: Lang): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const format = data.format ?? 'number';
  const text =
    format === 'duration'
      ? formatDuration(value, lang)
      : format === 'compact' || Math.abs(value) >= 100_000
        ? formatCompact(value, lang)
        : formatNumber(value, lang, 2);
  const unit = data.unit?.trim();
  if (!unit || format === 'duration') return text;
  return unit === '%' ? `${text}%` : `${text} ${unit}`;
}

/** Pie/doughnut: keep the largest slices and fold the rest into "Other" (never invent a 7th hue). */
export function foldSlices(data: ChartInput, otherLabel: string): ChartInput {
  const values = data.series[0]?.data ?? [];
  if (data.labels.length <= MAX_SLICES) return data;
  const ranked = data.labels
    .map((label, index) => ({ label, value: values[index] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const kept = ranked.slice(0, MAX_SLICES - 1);
  const rest = ranked.slice(MAX_SLICES - 1).reduce((sum, entry) => sum + entry.value, 0);
  return {
    ...data,
    labels: [...kept.map((entry) => entry.label), otherLabel],
    series: [{ name: data.series[0].name, data: [...kept.map((entry) => entry.value), rest] }],
  };
}

/** Canvas needs a concrete color; the palette tokens are hex. */
function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return color;
  const full = hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Theme-aware Chart.js wrapper. Single series use the primary data ink (white in dark mode);
 * multiple series take the validated categorical palette in fixed order.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" [style.height.px]="height()">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel()"></canvas>
    </div>
  `,
})
export class ChartView {
  readonly data = input.required<ChartInput>();
  readonly height = input(260);
  readonly ariaLabel = input('');

  private readonly theme = inject(ThemeService);
  private readonly i18n = inject(I18nService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;
  private frame = 0;

  constructor() {
    effect(() => {
      const data = this.data();
      const lang = this.i18n.lang();
      this.theme.isDark();
      const canvas = this.canvas().nativeElement;
      // Wait a frame so the theme class (and its CSS variables) is applied before reading colors.
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => untracked(() => this.render(canvas, data, lang)));
    });
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
      this.chart?.destroy();
    });
  }

  private render(canvas: HTMLCanvasElement, input: ChartInput, lang: Lang) {
    const styles = getComputedStyle(document.documentElement);
    const css = (name: string) => styles.getPropertyValue(name).trim();
    const palette = [1, 2, 3, 4, 5, 6].map((slot) => css(`--chart-${slot}`));
    const ink = css('--chart-ink');
    const ink2 = css('--chart-ink-2');
    const muted = css('--chart-muted');
    const grid = css('--chart-grid');
    const axis = css('--chart-axis');
    const surface = css('--chart-surface');
    const border = css('--border');

    const circular = input.type === 'pie' || input.type === 'doughnut';
    const data = circular ? foldSlices(input, this.i18n.t('common.other')) : input;
    const series = data.series.slice(0, MAX_SERIES);
    const single = series.length === 1 && !circular;
    const colorAt = (index: number) => (single ? css('--chart-primary') : palette[index % palette.length]);
    const horizontal = data.type === 'horizontalBar';
    const isBar = data.type === 'bar' || horizontal;
    const isLine = data.type === 'line' || data.type === 'area';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const format = (value: number | null) => formatChartValue(value, data, lang);
    const font = { size: 11, family: Chart.defaults.font.family };

    const datasets: ChartDataset[] = series.map((serie, index) => {
      const color = colorAt(index);
      if (circular) {
        return {
          label: serie.name,
          data: serie.data as number[],
          backgroundColor: data.labels.map((_, slice) => palette[slice % palette.length]),
          borderColor: surface,
          borderWidth: 2,
          hoverOffset: 4,
        } as ChartDataset<'doughnut'>;
      }
      if (isLine) {
        return {
          label: serie.name,
          data: serie.data,
          borderColor: color,
          backgroundColor: withAlpha(color, 0.1),
          fill: data.type === 'area' ? 'origin' : false,
          borderWidth: 2,
          tension: 0.35,
          spanGaps: true,
          pointRadius: data.labels.length <= 12 ? 3 : 0,
          pointBackgroundColor: color,
          pointBorderColor: surface,
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHitRadius: 12,
        } as ChartDataset<'line'>;
      }
      if (data.type === 'radar') {
        return {
          label: serie.name,
          data: serie.data,
          borderColor: color,
          backgroundColor: withAlpha(color, 0.1),
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: color,
          pointBorderColor: surface,
        } as ChartDataset<'radar'>;
      }
      return {
        label: serie.name,
        data: serie.data,
        backgroundColor: color,
        hoverBackgroundColor: color,
        borderRadius: 4,
        borderSkipped: 'start',
        maxBarThickness: 24,
        categoryPercentage: 0.72,
        barPercentage: series.length > 1 ? 0.92 : 0.8,
      } as ChartDataset<'bar'>;
    });

    // Counts never get fractional ticks (0.2 searches makes no sense).
    const integers = series.every((serie) => serie.data.every((value) => value === null || Number.isInteger(value)));
    const valueAxis = {
      beginAtZero: isBar || data.type === 'area',
      grid: { color: grid, drawTicks: false },
      border: { display: false },
      ticks: {
        color: muted,
        font,
        padding: 8,
        maxTicksLimit: 6,
        ...(integers && data.format !== 'duration' ? { precision: 0 } : {}),
        callback: (value: string | number) => format(Number(value)),
      },
    };
    const categoryAxis = {
      grid: { display: false },
      border: { color: axis },
      ticks: {
        color: muted,
        font,
        padding: 6,
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: horizontal ? 12 : 8,
        callback(this: { getLabelForValue(value: number): string }, value: string | number) {
          const label = this.getLabelForValue(Number(value));
          return label.length > 22 ? `${label.slice(0, 21)}…` : label;
        },
      },
    };

    const config: ChartConfiguration = {
      type: circular ? (data.type as 'pie' | 'doughnut') : isBar ? 'bar' : isLine ? 'line' : 'radar',
      data: { labels: data.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : { duration: 450 },
        indexAxis: horizontal ? 'y' : 'x',
        interaction: circular || data.type === 'radar' ? { mode: 'nearest', intersect: true } : { mode: 'index', intersect: false },
        layout: { padding: { top: 4, right: 8 } },
        ...(data.type === 'doughnut' ? { cutout: '64%' } : {}),
        plugins: {
          legend: {
            display: series.length > 1 || circular,
            position: 'bottom',
            align: 'start',
            labels: { color: ink2, font, boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 14 },
          },
          tooltip: {
            backgroundColor: css('--popover'),
            titleColor: ink,
            bodyColor: ink2,
            borderColor: border,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            boxWidth: 8,
            boxHeight: 8,
            boxPadding: 4,
            usePointStyle: true,
            titleFont: { ...font, size: 12, weight: 600 },
            bodyFont: font,
            callbacks: {
              label: (context) => {
                const raw = context.raw as number | null;
                const name = circular ? context.label : context.dataset.label;
                return ` ${name}: ${format(raw)}`;
              },
            },
          },
        },
        scales: circular
          ? {}
          : data.type === 'radar'
            ? {
                r: {
                  beginAtZero: true,
                  grid: { color: grid },
                  angleLines: { color: grid },
                  pointLabels: { color: ink2, font },
                  ticks: { display: false },
                },
              }
            : horizontal
              ? { x: { ...valueAxis, grid: { color: grid, drawTicks: false } }, y: categoryAxis }
              : { x: categoryAxis, y: valueAxis },
      },
    };

    this.chart?.destroy();
    this.chart = new Chart(canvas, config);
  }
}
