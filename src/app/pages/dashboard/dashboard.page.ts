import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookmarkCheck,
  Clock,
  Flame,
  Layers,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide';
import { API_URL } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  formatCompact,
  formatDate,
  formatDuration,
  formatNumber,
  formatPeriod,
  percentChange,
  relativeTime,
  signedPercent,
} from '../../core/format';
import { I18nService, TranslatePipe } from '../../core/i18n/i18n.service';
import type { EventSummary, SavedSearchSummary, StatsOverview } from '../../core/models';
import { DataSync } from '../../core/research.store';
import { SavedActions } from '../../core/saved-actions';
import { SUGGESTIONS } from '../../core/suggestions';
import { ChartCard } from '../../charts/chart-card';
import type { ChartInput } from '../../charts/chart';
import { Heatmap } from '../../charts/heatmap';
import { Sparkline } from '../../charts/sparkline';
import { UiButton } from '../../ui/button';
import { Icon } from '../../ui/icon';
import { Segmented } from '../../ui/segmented';
import { SavedCard } from '../library/saved-card';

type Period = 'daily' | 'weekly' | 'monthly';
type ActivityMetric = 'searches' | 'time';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    FormsModule,
    Icon,
    UiButton,
    TranslatePipe,
    ChartCard,
    Heatmap,
    Sparkline,
    Segmented,
    SavedCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
        <div>
          <p class="eyebrow">{{ today() }}</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {{ greeting() | t: { name: auth.firstName() } }}
          </h1>
          <p class="mt-2 max-w-xl text-[0.9375rem] text-muted-foreground">{{ 'dashboard.subtitle' | t }}</p>
        </div>
        <div class="flex gap-2">
          <a uiBtn variant="outline" routerLink="/library">{{ 'nav.library' | t }}</a>
          <a uiBtn routerLink="/search">
            <svg appIcon [icon]="icons.Plus" class="size-4"></svg>{{ 'nav.newSearch' | t }}
          </a>
        </div>
      </header>

      @if (stats.error()) {
        <div class="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <p class="font-medium">{{ 'errors.loadDashboard' | t }}</p>
          <p class="text-sm text-muted-foreground">{{ 'errors.checkBackend' | t }}</p>
          <button uiBtn variant="outline" size="sm" (click)="stats.reload()">
            <svg appIcon [icon]="icons.RefreshCw" class="size-3.5"></svg>{{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (!stats.hasValue()) {
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-36 rounded-xl animate-shimmer"></div>
          }
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="h-80 rounded-xl animate-shimmer lg:col-span-2"></div>
          <div class="h-80 rounded-xl animate-shimmer"></div>
        </div>
      } @else {
        @let s = data()!;
        @if (s.totals.totalSearches === 0) {
          <!-- Onboarding -->
          <section class="surface-card relative overflow-hidden px-6 py-14 text-center sm:px-12 animate-fade-up">
            <div
              class="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
            ></div>
            <div class="relative mx-auto max-w-2xl">
              <span class="mx-auto flex size-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                <svg appIcon [icon]="icons.Sparkles" class="size-5"></svg>
              </span>
              <h2 class="mt-5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {{ 'dashboard.empty.title' | t }}
              </h2>
              <p class="mt-3 text-muted-foreground text-pretty">{{ 'dashboard.empty.description' | t }}</p>
              <form class="mx-auto mt-8 flex max-w-xl gap-2" (submit)="startSearch($event)">
                <div class="relative flex-1">
                  <svg
                    appIcon
                    [icon]="icons.Search"
                    class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  ></svg>
                  <input
                    name="topic"
                    [(ngModel)]="topic"
                    [placeholder]="'search.placeholder' | t"
                    class="h-11 w-full rounded-lg border border-input bg-card pr-3 pl-10 text-[0.9375rem] shadow-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                  />
                </div>
                <button uiBtn size="lg" type="submit">{{ 'search.submit' | t }}</button>
              </form>
              <div class="mt-5 flex flex-wrap justify-center gap-2">
                @for (suggestion of suggestions(); track suggestion) {
                  <button
                    type="button"
                    class="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    (click)="go(suggestion)"
                  >
                    {{ suggestion }}
                  </button>
                }
              </div>
            </div>
          </section>
        } @else {
          <!-- KPI tiles -->
          <section class="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4" aria-label="KPIs">
            @for (kpi of kpis(); track kpi.label) {
              <div class="surface-card flex flex-col p-5 animate-fade-up">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-medium text-muted-foreground">{{ kpi.label | t }}</p>
                  <svg appIcon [icon]="kpi.icon" class="size-4 text-muted-foreground"></svg>
                </div>
                <p class="mt-3 text-3xl font-semibold tracking-tight">{{ kpi.value }}</p>
                <div class="mt-1.5 flex min-h-5 items-center gap-1.5 text-xs">
                  @if (kpi.delta !== null) {
                    <span
                      class="inline-flex items-center gap-0.5 font-medium"
                      [class.text-success]="kpi.delta > 0"
                      [class.text-muted-foreground]="kpi.delta <= 0"
                    >
                      <svg
                        appIcon
                        [icon]="kpi.delta > 0 ? icons.ArrowUpRight : kpi.delta < 0 ? icons.ArrowDownRight : icons.Minus"
                        class="size-3.5"
                      ></svg>
                      {{ kpi.deltaLabel }}
                    </span>
                  }
                  <span class="truncate text-muted-foreground">{{ kpi.caption }}</span>
                </div>
                @if (kpi.trend) {
                  <app-sparkline class="mt-4 block text-foreground" [values]="kpi.trend" />
                }
              </div>
            }
          </section>

          <!-- Secondary stats strip -->
          <section class="surface-card grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
            @for (item of strip(); track item.label) {
              <div class="px-5 py-4">
                <p class="text-xs text-muted-foreground">{{ item.label | t }}</p>
                <p class="mt-1 text-lg font-semibold tracking-tight">{{ item.value }}</p>
              </div>
            }
          </section>

          <!-- Activity + categories -->
          <section class="grid gap-4 lg:grid-cols-3 overflow-x-auto">
            <app-chart-card
              class="lg:col-span-2"
              [heading]="activityTitle() | t"
              [subtitle]="activitySubtitle() | t"
              [data]="activityChart()"
              [height]="260"
            >
              <div cardToolbar class="mt-4 flex flex-wrap items-center justify-between gap-2">
                <app-segmented [options]="metricOptions()" [(value)]="metric" />
                <app-segmented [options]="periodOptions()" [(value)]="period" />
              </div>
            </app-chart-card>

            <app-chart-card
              [heading]="'dashboard.categories.title' | t"
              [subtitle]="'dashboard.categories.subtitle' | t"
              [data]="categoriesChart()"
              [height]="260"
            />
          </section>

          <!-- Heatmap + peak hours -->
          <section class="grid gap-4 lg:grid-cols-3 overflow-x-auto">
            <div class="surface-card p-5 lg:col-span-2">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 class="text-sm font-semibold tracking-tight">{{ 'dashboard.heatmap.title' | t }}</h3>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ 'dashboard.heatmap.subtitle' | t: { n: s.streak.activeDaysLast30 } }}
                  </p>
                </div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                  <svg appIcon [icon]="icons.Flame" class="size-3.5"></svg>
                  {{ 'dashboard.heatmap.longest' | t: { n: s.streak.longest } }}
                </span>
              </div>
              <div class="mt-5">
                <app-heatmap [days]="s.daily" />
              </div>
            </div>
            <app-chart-card
              [heading]="'dashboard.hours.title' | t"
              [subtitle]="peakHourLabel()"
              [data]="hourlyChart()"
              [height]="180"
            />
          </section>

          <!-- Quick access -->
          <section>
            <div class="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold tracking-tight">{{ 'dashboard.quick.title' | t }}</h2>
                <p class="text-sm text-muted-foreground">{{ 'dashboard.quick.subtitle' | t }}</p>
              </div>
              <div class="flex items-center gap-2">
                @if (s.favorites.length) {
                  <app-segmented [options]="quickOptions()" [(value)]="quickTab" />
                }
                <a uiBtn variant="ghost" size="sm" routerLink="/library">
                  {{ 'common.viewAll' | t }}<svg appIcon [icon]="icons.ArrowRight" class="size-3.5"></svg>
                </a>
              </div>
            </div>
            @if (quickItems().length) {
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                @for (item of quickItems(); track item.id) {
                  <app-saved-card [item]="item" (favorite)="toggleFavorite($event)" />
                }
              </div>
            } @else {
              <div class="surface-card border-dashed p-8 text-center text-sm text-muted-foreground">
                {{ 'dashboard.quick.empty' | t }}
              </div>
            }
          </section>

          <!-- Top topics, recent activity, source quality -->
          <section class="grid gap-4 lg:grid-cols-3">
            <div class="surface-card p-5">
              <h3 class="text-sm font-semibold tracking-tight">{{ 'dashboard.top.title' | t }}</h3>
              <p class="mt-1 text-xs text-muted-foreground">{{ 'dashboard.top.subtitle' | t }}</p>
              <ol class="mt-4 flex flex-col gap-3">
                @for (topic of s.topTopics; track topic.latestEventId) {
                  <li>
                    <button type="button" class="group w-full text-left" (click)="openTopic(topic)">
                      <div class="flex items-baseline justify-between gap-3 text-sm">
                        <span class="truncate group-hover:underline group-hover:underline-offset-4">{{ topic.topic }}</span>
                        <span class="tabular shrink-0 text-xs text-muted-foreground">
                          {{ 'dashboard.top.times' | t: { n: topic.count } }}
                        </span>
                      </div>
                      <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-(--chart-primary) transition-[width] duration-500"
                          [style.width.%]="(topic.count / topTopicMax()) * 100"
                        ></div>
                      </div>
                    </button>
                  </li>
                }
              </ol>
            </div>

            <div class="surface-card p-5">
              <h3 class="text-sm font-semibold tracking-tight">{{ 'dashboard.recent.title' | t }}</h3>
              <p class="mt-1 text-xs text-muted-foreground">{{ 'dashboard.recent.subtitle' | t }}</p>
              <ul class="mt-3 -mx-2 flex flex-col">
                @for (event of s.recentEvents; track event.id) {
                  <li>
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
                      (click)="openEvent(event)"
                    >
                      <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <svg appIcon [icon]="event.savedSearchId ? icons.BookmarkCheck : icons.Search" class="size-3.5"></svg>
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm">{{ event.topic }}</span>
                        <span class="block text-xs text-muted-foreground">
                          {{ ago(event.createdAt) }} · {{ duration(event.researchMs) }} ·
                          {{ 'common.sourcesCount' | t: { n: event.sourceCount } }}
                        </span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            </div>

            <app-chart-card
              [heading]="'dashboard.sources.title' | t"
              [subtitle]="sourcesSubtitle()"
              [data]="sourceTypesChart()"
              [height]="220"
            />
          </section>
        }
      }
    </div>
  `,
})
export class DashboardPage {
  protected readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly sync = inject(DataSync);
  private readonly savedActions = inject(SavedActions);

  protected readonly icons = {
    Plus,
    Search,
    Sparkles,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    ArrowRight,
    Minus,
    Flame,
    BookmarkCheck,
  };
  private readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  protected readonly stats = httpResource<StatsOverview>(() => {
    this.sync.version();
    return { url: `${API_URL}/stats/overview`, params: { tz: this.timezone } };
  });
  /** Safe accessor: value() throws while the resource is in error state. */
  protected readonly data = computed(() => (this.stats.hasValue() ? this.stats.value() : undefined));

  protected topic = '';
  protected readonly period = signal<Period>('daily');
  protected readonly metric = signal<ActivityMetric>('searches');
  protected readonly quickTab = signal<'recent' | 'favorites'>('recent');

  protected readonly suggestions = computed(() => SUGGESTIONS[this.i18n.lang()]);
  protected readonly today = computed(() => formatDate(new Date(), this.i18n.lang(), 'long'));
  protected readonly greeting = computed(() => {
    this.i18n.lang();
    const hour = new Date().getHours();
    return hour < 12 ? 'dashboard.greeting.morning' : hour < 19 ? 'dashboard.greeting.afternoon' : 'dashboard.greeting.evening';
  });

  protected readonly periodOptions = computed(() => [
    { value: 'daily' as Period, label: this.i18n.t('dashboard.activity.daily') },
    { value: 'weekly' as Period, label: this.i18n.t('dashboard.activity.weekly') },
    { value: 'monthly' as Period, label: this.i18n.t('dashboard.activity.monthly') },
  ]);
  protected readonly metricOptions = computed(() => [
    { value: 'searches' as ActivityMetric, label: this.i18n.t('dashboard.activity.searches') },
    { value: 'time' as ActivityMetric, label: this.i18n.t('dashboard.activity.time') },
  ]);
  protected readonly quickOptions = computed(() => [
    { value: 'recent' as const, label: this.i18n.t('dashboard.quick.recent') },
    { value: 'favorites' as const, label: this.i18n.t('dashboard.quick.favorites') },
  ]);

  protected readonly kpis = computed(() => {
    const stats = this.data();
    if (!stats) return [];
    const lang = this.i18n.lang();
    const t = stats.totals;
    const weeklySearches = stats.weekly.map((point) => point.searches);
    const weeklyTime = stats.weekly.map((point) => point.timeMs);
    const searchDelta = percentChange(t.thisWeek, t.lastWeek);
    const timeDelta = percentChange(t.timeThisWeekMs, t.timeLastWeekMs);
    return [
      {
        label: 'dashboard.kpi.searches',
        icon: Search,
        value: formatNumber(t.totalSearches, lang, 0),
        delta: searchDelta,
        deltaLabel: searchDelta === null ? '' : signedPercent(searchDelta, lang),
        caption: this.i18n.t('dashboard.kpi.thisWeek', { n: t.thisWeek }),
        trend: weeklySearches,
      },
      {
        label: 'dashboard.kpi.time',
        icon: Clock,
        value: formatDuration(t.totalTimeMs, lang),
        delta: timeDelta,
        deltaLabel: timeDelta === null ? '' : signedPercent(timeDelta, lang),
        caption: this.i18n.t('dashboard.kpi.timeThisWeek', { time: formatDuration(t.timeThisWeekMs, lang) }),
        trend: weeklyTime,
      },
      {
        label: 'dashboard.kpi.saved',
        icon: Layers,
        value: formatNumber(t.savedCount, lang, 0),
        delta: null,
        deltaLabel: '',
        caption: this.i18n.t('dashboard.kpi.favorites', { n: t.favoriteCount }),
        trend: stats.weekly.map((point) => point.saved),
      },
      {
        label: 'dashboard.kpi.streak',
        icon: Flame,
        value: this.i18n.t('dashboard.kpi.days', { n: stats.streak.current }),
        delta: null,
        deltaLabel: '',
        caption: this.i18n.t('dashboard.kpi.activeDays', { n: stats.streak.activeDaysLast30 }),
        trend: stats.daily.slice(-30).map((point) => point.searches),
      },
    ];
  });

  protected readonly strip = computed(() => {
    const stats = this.data();
    if (!stats) return [];
    const lang = this.i18n.lang();
    const t = stats.totals;
    return [
      { label: 'dashboard.strip.uniqueTopics', value: formatNumber(t.uniqueTopics, lang, 0) },
      { label: 'dashboard.strip.sources', value: formatCompact(t.totalSources, lang) },
      { label: 'dashboard.strip.avgResearch', value: formatDuration(t.avgResearchMs, lang) },
      { label: 'dashboard.strip.reading', value: formatDuration(t.readingTimeMs, lang) },
    ];
  });

  protected readonly activityTitle = computed(() =>
    this.metric() === 'searches' ? 'dashboard.activity.titleSearches' : 'dashboard.activity.titleTime',
  );
  protected readonly activitySubtitle = computed(() => `dashboard.activity.subtitle.${this.period()}`);

  protected readonly activityChart = computed<ChartInput>(() => {
    const stats = this.data();
    const lang = this.i18n.lang();
    const period = this.period();
    const metric = this.metric();
    const points = !stats ? [] : period === 'daily' ? stats.daily.slice(-30) : period === 'weekly' ? stats.weekly : stats.monthly;
    const unit = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
    return {
      type: 'bar',
      labels: points.map((point) => formatPeriod(point.period, unit, lang)),
      series: [
        {
          name: this.i18n.t(metric === 'searches' ? 'dashboard.activity.searches' : 'dashboard.activity.time'),
          data: points.map((point) => (metric === 'searches' ? point.searches : point.timeMs)),
        },
      ],
      format: metric === 'time' ? 'duration' : 'number',
    };
  });

  protected readonly categoriesChart = computed<ChartInput>(() => {
    const stats = this.data();
    const categories = stats?.categories ?? [];
    return {
      type: 'horizontalBar',
      labels: categories.map((entry) => this.i18n.t(`categories.${entry.category}`)),
      series: [{ name: this.i18n.t('dashboard.activity.searches'), data: categories.map((entry) => entry.count) }],
    };
  });

  protected readonly hourlyChart = computed<ChartInput>(() => {
    const hours = this.data()?.hourly ?? [];
    return {
      type: 'bar',
      labels: hours.map((entry) => `${entry.hour}h`),
      series: [{ name: this.i18n.t('dashboard.activity.searches'), data: hours.map((entry) => entry.count) }],
    };
  });

  protected readonly peakHourLabel = computed(() => {
    const hours = this.data()?.hourly ?? [];
    const peak = hours.reduce((best, entry) => (entry.count > best.count ? entry : best), { hour: -1, count: 0 });
    return peak.hour < 0
      ? this.i18n.t('dashboard.hours.subtitle')
      : this.i18n.t('dashboard.hours.peak', { hour: `${peak.hour}:00` });
  });

  protected readonly sourceTypesChart = computed<ChartInput>(() => {
    const types = this.data()?.sourceTypes ?? [];
    return {
      type: 'doughnut',
      labels: types.map((entry) => this.i18n.t(`sourceTypes.${entry.type}`)),
      series: [{ name: this.i18n.t('dashboard.sources.title'), data: types.map((entry) => entry.count) }],
    };
  });

  protected readonly sourcesSubtitle = computed(() => {
    const avg = this.data()?.totals.avgCredibility;
    return avg === null || avg === undefined
      ? this.i18n.t('dashboard.sources.empty')
      : this.i18n.t('dashboard.sources.subtitle', { score: Math.round(avg) });
  });

  protected readonly topTopicMax = computed(() => Math.max(1, ...(this.data()?.topTopics ?? []).map((t) => t.count)));

  protected readonly quickItems = computed<SavedSearchSummary[]>(() => {
    const stats = this.data();
    if (!stats) return [];
    return this.quickTab() === 'favorites' && stats.favorites.length ? stats.favorites : stats.recentSaved;
  });

  protected ago(value: string) {
    return relativeTime(value, this.i18n.lang());
  }

  protected duration(ms: number) {
    return formatDuration(ms, this.i18n.lang());
  }

  protected startSearch(event: Event) {
    event.preventDefault();
    this.go(this.topic);
  }

  protected go(topic: string) {
    const q = topic.trim();
    if (q.length >= 2) this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected openTopic(topic: StatsOverview['topTopics'][number]) {
    this.router.navigate(topic.savedSearchId ? ['/library', topic.savedSearchId] : ['/research', topic.latestEventId]);
  }

  protected openEvent(event: EventSummary) {
    this.router.navigate(event.savedSearchId ? ['/library', event.savedSearchId] : ['/research', event.id]);
  }

  protected async toggleFavorite(item: SavedSearchSummary) {
    await this.savedActions.toggleFavorite(item);
  }
}
