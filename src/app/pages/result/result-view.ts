import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Calendar,
  ChartColumn,
  CircleAlert,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  Minus,
  Plus,
  Printer,
  Scale,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  countryName,
  faviconUrl,
  formatCompact,
  formatDate,
  formatDuration,
  formatNumber,
  formatYearMonth,
  signedPercent,
} from '../../core/format';
import { I18nService, TranslatePipe } from '../../core/i18n/i18n.service';
import type { ResearchResult, Source } from '../../core/models';
import { trackReadingTime } from '../../core/reading-tracker';
import { DataSync, ResearchStore } from '../../core/research.store';
import { SavedActions } from '../../core/saved-actions';
import { ToastService } from '../../core/toast.service';
import { ChartCard } from '../../charts/chart-card';
import type { ChartInput } from '../../charts/chart';
import { UiBadge, UiButton } from '../../ui/button';
import { Icon } from '../../ui/icon';

export interface ResultViewData {
  result: ResearchResult;
  eventId: string | null;
  savedSearchId: string | null;
  isFavorite: boolean;
  viewCount: number | null;
  savedAt: string | null;
}

interface NavSection {
  id: string;
  label: string;
}

@Component({
  selector: 'app-result-view',
  imports: [RouterLink, Icon, UiButton, UiBadge, TranslatePipe, ChartCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = data().result;
    @let report = r.report;

    <!-- Action bar -->
    <div
      class="sticky top-14 z-20 -mx-4 -mt-6 mb-6 border-b border-border/70 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8 no-print"
    >
      <div class="flex items-center gap-2">
        <a uiBtn variant="ghost" size="sm" [routerLink]="savedId() ? '/library' : '/search'" class="-ml-2">
          <svg appIcon [icon]="icons.ArrowLeft" class="size-4"></svg>
          <span class="hidden sm:inline">{{ (savedId() ? 'nav.library' : 'nav.newSearch') | t }}</span>
        </a>
        <nav
          class="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden"
          [attr.aria-label]="'result.sectionsNav' | t"
        >
          @for (section of navSections(); track section.id) {
            <button
              type="button"
              class="shrink-0 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              (click)="scrollTo(section.id)"
            >
              {{ section.label | t }}
            </button>
          }
        </nav>
        <div class="ml-auto flex items-center gap-1.5">
          <button uiBtn variant="ghost" size="icon-sm" [title]="'result.actions.export' | t" [attr.aria-label]="'result.actions.export' | t" (click)="exportJson()">
            <svg appIcon [icon]="icons.Download" class="size-4"></svg>
          </button>
          <button uiBtn variant="ghost" size="icon-sm" [title]="'result.actions.print' | t" [attr.aria-label]="'result.actions.print' | t" (click)="print()">
            <svg appIcon [icon]="icons.Printer" class="size-4"></svg>
          </button>
          @if (savedId()) {
            <button
              uiBtn
              variant="ghost"
              size="icon-sm"
              [class.text-amber-500]="favorite()"
              [attr.aria-pressed]="favorite()"
              [title]="(favorite() ? 'library.unfavorite' : 'library.favorite') | t"
              [attr.aria-label]="(favorite() ? 'library.unfavorite' : 'library.favorite') | t"
              (click)="toggleFavorite()"
            >
              <svg appIcon [icon]="icons.Star" class="size-4" [class.fill-current]="favorite()"></svg>
            </button>
            <button
              uiBtn
              variant="ghost"
              size="icon-sm"
              class="hover:text-destructive"
              [title]="'library.delete' | t"
              [attr.aria-label]="'library.delete' | t"
              (click)="remove()"
            >
              <svg appIcon [icon]="icons.Trash2" class="size-4"></svg>
            </button>
            <span uiBadge variant="success" class="ml-1 h-8 rounded-lg px-3">
              <svg appIcon [icon]="icons.BookmarkCheck" class="size-3.5"></svg>{{ 'result.actions.saved' | t }}
            </span>
          } @else {
            <button uiBtn size="sm" class="h-8 px-4" [disabled]="saving() || !data().eventId" (click)="save()">
              <svg appIcon [icon]="saving() ? icons.LoaderCircle : icons.Bookmark" class="size-4" [class.animate-spin]="saving()"></svg>
              {{ 'result.actions.save' | t }}
            </button>
          }
        </div>
      </div>
    </div>

    <article class="flex flex-col gap-10">
      <!-- Hero -->
      <header id="summary" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] animate-fade-up">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span uiBadge variant="outline">{{ 'categories.' + report.category | t }}</span>
            <span uiBadge variant="secondary">
              {{ (r.meta.provider === 'claude' ? 'result.provider.claude' : 'result.provider.openData') | t }}
            </span>
            <span uiBadge [variant]="confidenceVariant()">
              <svg appIcon [icon]="icons.ShieldCheck" class="size-3"></svg>
              {{ 'result.confidence.' + report.confidence.level | t }}
            </span>
          </div>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {{ report.title }}
          </h1>
          <p class="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground text-pretty">{{ report.tldr }}</p>
          <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1.5">
              <svg appIcon [icon]="icons.Calendar" class="size-3.5"></svg>{{ generatedAt() }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <svg appIcon [icon]="icons.Clock" class="size-3.5"></svg>
              {{ 'result.meta.researchTime' | t: { time: researchTime() } }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <svg appIcon [icon]="icons.FileText" class="size-3.5"></svg>
              {{ 'common.sourcesCount' | t: { n: r.sources.length } }}
            </span>
            @if (data().viewCount) {
              <span>{{ 'result.meta.views' | t: { n: data().viewCount! } }}</span>
            }
          </div>

          @if (warning()) {
            <div class="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <svg appIcon [icon]="icons.CircleAlert" class="mt-0.5 size-4 text-amber-600 dark:text-amber-400"></svg>
              <span>{{ warning()! | t }}</span>
            </div>
          }

          <section class="surface-card mt-6 p-6">
            <p class="eyebrow">{{ 'result.summary' | t }}</p>
            <div class="prose-body mt-3 flex flex-col gap-3">
              @for (paragraph of paragraphs(report.summary); track $index) {
                <p>{{ paragraph }}</p>
              }
            </div>
          </section>
        </div>

        <aside class="flex flex-col gap-4">
          @if (r.enrichment.wikipedia?.thumbnail; as thumbnail) {
            <figure class="surface-card overflow-hidden">
              <img
                [src]="thumbnail"
                [alt]="r.enrichment.wikipedia!.title"
                class="aspect-[4/3] w-full bg-white object-cover"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
              <figcaption class="px-4 py-2.5 text-[11px] text-muted-foreground">
                {{ r.enrichment.wikipedia!.title }} · Wikipedia
              </figcaption>
            </figure>
          }
          <div class="surface-card grid grid-cols-2 gap-px overflow-hidden bg-border">
            @for (item of glance(); track item.label) {
              <div class="bg-card p-4">
                <p class="text-[11px] text-muted-foreground">{{ item.label | t }}</p>
                <p class="mt-1 text-xl font-semibold tracking-tight">{{ item.value }}</p>
              </div>
            }
          </div>
        </aside>
      </header>

      <!-- Metrics -->
      @if (report.metrics.length) {
        <section id="metrics" class="scroll-mt-32">
          <h2 class="mb-4 text-lg font-semibold tracking-tight">{{ 'result.sections.metrics' | t }}</h2>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            @for (metric of report.metrics; track $index) {
              <div class="surface-card flex flex-col p-5">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-xs font-medium text-muted-foreground">{{ metric.label }}</p>
                  @if (metric.trend) {
                    <span
                      class="inline-flex items-center gap-0.5 text-xs font-medium"
                      [class.text-success]="metric.trend === 'up'"
                      [class.text-muted-foreground]="metric.trend !== 'up'"
                    >
                      <svg
                        appIcon
                        [icon]="metric.trend === 'up' ? icons.ArrowUpRight : metric.trend === 'down' ? icons.ArrowDownRight : icons.Minus"
                        class="size-3.5"
                      ></svg>
                      {{ 'result.trend.' + metric.trend | t }}
                    </span>
                  }
                </div>
                <p class="mt-2 text-2xl font-semibold tracking-tight break-words">{{ metric.value }}</p>
                <p class="mt-1.5 text-xs leading-relaxed text-muted-foreground">{{ metric.context }}</p>
                @if (metric.sourceId) {
                  <div class="mt-auto pt-3">
                    <button type="button" class="source-ref" (click)="goToSource(metric.sourceId)">
                      {{ 'result.source' | t }} {{ metric.sourceId }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- Topic charts -->
      @if (reportCharts().length) {
        <section id="charts" class="scroll-mt-32">
          <h2 class="mb-1 text-lg font-semibold tracking-tight">{{ 'result.sections.charts' | t }}</h2>
          <p class="mb-4 text-sm text-muted-foreground">{{ 'result.chartsNote' | t }}</p>
          <div class="grid gap-4 lg:grid-cols-2">
            @for (chart of reportCharts(); track chart.id) {
              <app-chart-card [heading]="chart.title" [subtitle]="chart.description" [data]="chart.input" [height]="260">
                @if (chart.sourceIds.length) {
                  <div class="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                    <span class="text-[11px] text-muted-foreground">{{ 'result.sourcesLabel' | t }}</span>
                    @for (id of chart.sourceIds; track id) {
                      <button type="button" class="source-ref" (click)="goToSource(id)">{{ id }}</button>
                    }
                  </div>
                }
              </app-chart-card>
            }
          </div>
        </section>
      }

      <!-- Topic pulse (open data) -->
      @if (r.enrichment.interest || r.enrichment.academic) {
        <section id="pulse" class="scroll-mt-32">
          <h2 class="mb-1 text-lg font-semibold tracking-tight">{{ 'result.sections.pulse' | t }}</h2>
          <p class="mb-4 text-sm text-muted-foreground">{{ 'result.pulseNote' | t }}</p>
          <div class="grid gap-4 lg:grid-cols-2">
            @if (interestChart(); as chart) {
              <app-chart-card
                [eyebrow]="'Wikipedia · Wikimedia'"
                [heading]="'result.pulse.interest' | t"
                [subtitle]="interestSubtitle()"
                [data]="chart"
                [height]="240"
              />
            }
            @if (academicChart(); as chart) {
              <app-chart-card
                [eyebrow]="'OpenAlex'"
                [heading]="'result.pulse.academic' | t"
                [subtitle]="academicSubtitle()"
                [data]="chart"
                [height]="240"
              />
            }
            @if (countriesChart(); as chart) {
              <app-chart-card
                [eyebrow]="'OpenAlex'"
                [heading]="'result.pulse.countries' | t"
                [subtitle]="'result.pulse.countriesNote' | t"
                [data]="chart"
                [height]="280"
              />
            }
            @if (fieldsChart(); as chart) {
              <app-chart-card
                [eyebrow]="'OpenAlex'"
                [heading]="'result.pulse.fields' | t"
                [subtitle]="'result.pulse.fieldsNote' | t"
                [data]="chart"
                [height]="280"
              />
            }
          </div>

          @if (r.enrichment.academic?.topWorks?.length) {
            <div class="surface-card mt-4 p-5">
              <div class="flex items-center gap-2">
                <svg appIcon [icon]="icons.GraduationCap" class="size-4"></svg>
                <h3 class="text-sm font-semibold tracking-tight">{{ 'result.pulse.topWorks' | t }}</h3>
              </div>
              <ol class="mt-4 flex flex-col divide-y divide-border">
                @for (work of r.enrichment.academic!.topWorks; track $index) {
                  <li class="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                    <span class="w-5 shrink-0 text-sm text-muted-foreground tabular">{{ $index + 1 }}</span>
                    <div class="min-w-0 flex-1">
                      @if (work.url) {
                        <a [href]="work.url" target="_blank" rel="noopener noreferrer" class="text-sm font-medium hover:underline hover:underline-offset-4">
                          {{ work.title }}
                        </a>
                      } @else {
                        <p class="text-sm font-medium">{{ work.title }}</p>
                      }
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        {{ work.venue || 'OpenAlex' }}@if (work.year) { · {{ work.year }} }
                      </p>
                      <div class="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div class="h-full rounded-full bg-[var(--chart-primary)]" [style.width.%]="(work.citations / maxCitations()) * 100"></div>
                      </div>
                    </div>
                    <span class="shrink-0 text-right text-xs text-muted-foreground">
                      <span class="block text-sm font-semibold text-foreground">{{ compact(work.citations) }}</span>
                      {{ 'result.pulse.citations' | t }}
                    </span>
                  </li>
                }
              </ol>
            </div>
          }
        </section>
      }

      <!-- Key insights -->
      @if (report.keyPoints.length) {
        <section id="insights" class="scroll-mt-32">
          <h2 class="mb-4 text-lg font-semibold tracking-tight">{{ 'result.sections.insights' | t }}</h2>
          <div class="grid gap-4 md:grid-cols-2">
            @for (point of report.keyPoints; track $index) {
              <div class="surface-card flex gap-4 p-5">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular">
                  {{ $index + 1 }}
                </span>
                <div class="min-w-0">
                  <h3 class="text-[0.9375rem] font-semibold tracking-tight">{{ point.title }}</h3>
                  <p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{{ point.detail }}</p>
                  @if (point.sourceIds.length) {
                    <div class="mt-2.5 flex flex-wrap gap-1">
                      @for (id of point.sourceIds; track id) {
                        <button type="button" class="source-ref" (click)="goToSource(id)">{{ id }}</button>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- Timeline + perspectives -->
      @if (report.timeline.length || hasPerspectives()) {
        <section id="timeline" class="grid gap-4 scroll-mt-32 lg:grid-cols-2">
          @if (report.timeline.length) {
            <div class="surface-card p-6" [class.lg:col-span-2]="!hasPerspectives()">
              <h2 class="text-lg font-semibold tracking-tight">{{ 'result.sections.timeline' | t }}</h2>
              <ol class="relative mt-5 ml-1.5 border-l border-border">
                @for (item of report.timeline; track $index) {
                  <li class="relative pb-6 pl-6 last:pb-0">
                    <span class="absolute top-1.5 -left-[5px] size-2.5 rounded-full border-2 border-card bg-foreground"></span>
                    <p class="text-xs font-semibold tabular">{{ item.date }}</p>
                    @if (item.title && item.title !== item.description) {
                      <p class="mt-1 text-sm font-medium">{{ item.title }}</p>
                    }
                    <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{{ item.description }}</p>
                  </li>
                }
              </ol>
            </div>
          }
          @if (hasPerspectives()) {
            <div class="surface-card p-6" [class.lg:col-span-2]="!report.timeline.length">
              <h2 class="text-lg font-semibold tracking-tight">{{ 'result.sections.perspectives' | t }}</h2>
              <div class="mt-5 grid gap-6" [class.sm:grid-cols-2]="!report.timeline.length">
                @if (report.perspectives.consensus.length) {
                  <div>
                    <p class="flex items-center gap-2 text-sm font-medium">
                      <svg appIcon [icon]="icons.ShieldCheck" class="size-4"></svg>{{ 'result.consensus' | t }}
                    </p>
                    <ul class="mt-3 flex flex-col gap-2.5">
                      @for (item of report.perspectives.consensus; track $index) {
                        <li class="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                          <span class="mt-2 size-1 shrink-0 rounded-full bg-foreground"></span>{{ item }}
                        </li>
                      }
                    </ul>
                  </div>
                }
                @if (report.perspectives.debates.length) {
                  <div>
                    <p class="flex items-center gap-2 text-sm font-medium">
                      <svg appIcon [icon]="icons.Scale" class="size-4"></svg>{{ 'result.debates' | t }}
                    </p>
                    <ul class="mt-3 flex flex-col gap-2.5">
                      @for (item of report.perspectives.debates; track $index) {
                        <li class="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                          <span class="mt-2 size-1 shrink-0 rounded-full border border-foreground"></span>{{ item }}
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </div>
          }
        </section>
      }

      <!-- Deep dive -->
      @if (report.sections.length) {
        <section id="analysis" class="scroll-mt-32">
          <h2 class="mb-4 text-lg font-semibold tracking-tight">{{ 'result.sections.analysis' | t }}</h2>
          <div class="grid gap-4 lg:grid-cols-2">
            @for (section of report.sections; track $index) {
              @let long = section.body.length > 420;
              @let open = expanded().has($index);
              <div class="surface-card flex flex-col p-6">
                <h3 class="font-semibold tracking-tight">{{ section.heading }}</h3>
                <div class="relative mt-3">
                  <div class="prose-body flex flex-col gap-3 overflow-hidden text-[0.9375rem]" [class.max-h-48]="long && !open">
                    @for (paragraph of paragraphs(section.body); track $index) {
                      <p>{{ paragraph }}</p>
                    }
                  </div>
                  @if (long && !open) {
                    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-card to-transparent"></div>
                  }
                </div>
                @if (long) {
                  <button
                    type="button"
                    class="mt-3 self-start text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline no-print"
                    [attr.aria-expanded]="open"
                    (click)="toggleSection($index)"
                  >
                    {{ (open ? 'result.readLess' : 'result.readMore') | t }}
                  </button>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- FAQ -->
      @if (report.faq.length) {
        <section class="surface-card divide-y divide-border">
          <div class="flex items-center gap-2 p-6 pb-4">
            <svg appIcon [icon]="icons.Lightbulb" class="size-4"></svg>
            <h2 class="text-lg font-semibold tracking-tight">{{ 'result.sections.faq' | t }}</h2>
          </div>
          @for (item of report.faq; track $index) {
            <details class="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                {{ item.question }}
                <svg appIcon [icon]="icons.Plus" class="size-4 shrink-0 transition-transform group-open:rotate-45"></svg>
              </summary>
              <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{{ item.answer }}</p>
            </details>
          }
        </section>
      }

      <!-- Sources -->
      <section id="sources" class="scroll-mt-32">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 class="text-lg font-semibold tracking-tight">{{ 'result.sections.sources' | t }}</h2>
            <p class="text-sm text-muted-foreground">{{ 'result.sourcesNote' | t }}</p>
          </div>
        </div>
        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <ol class="flex flex-col gap-2">
            @for (source of r.sources; track source.id) {
              <li
                [id]="'source-' + source.id"
                class="surface-card flex items-start gap-3.5 p-4 transition-[box-shadow,border-color] duration-500 scroll-mt-32"
                [class.ring-2]="highlighted() === source.id"
                [class.ring-ring]="highlighted() === source.id"
              >
                <span class="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground tabular">{{ source.id }}</span>
                <img [src]="favicon(source.domain)" alt="" class="mt-0.5 size-4 shrink-0 rounded-sm" loading="lazy" />
                <div class="min-w-0 flex-1">
                  <a
                    [href]="source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group inline-flex items-start gap-1 text-sm font-medium hover:underline hover:underline-offset-4"
                  >
                    <span class="line-clamp-2">{{ source.title }}</span>
                    <svg appIcon [icon]="icons.ExternalLink" class="mt-0.5 size-3 shrink-0 text-muted-foreground"></svg>
                  </a>
                  <p class="mt-0.5 truncate text-xs text-muted-foreground">
                    {{ source.publisher }} · {{ source.domain }}@if (source.publishedAt) { · {{ source.publishedAt }} }
                  </p>
                  @if (source.snippet) {
                    <p class="mt-2 line-clamp-2 border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-muted-foreground">
                      “{{ source.snippet }}”
                    </p>
                  }
                </div>
                <div class="hidden w-28 shrink-0 sm:block">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-muted-foreground">{{ 'sourceTypes.' + source.type | t }}</span>
                    <span class="font-semibold tabular">{{ source.credibility }}</span>
                  </div>
                  <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" [title]="credibilityLabel(source) | t">
                    <div class="h-full rounded-full bg-foreground" [style.width.%]="source.credibility"></div>
                  </div>
                  <p class="mt-1 text-[10px] text-muted-foreground">{{ credibilityLabel(source) | t }}</p>
                </div>
              </li>
            }
          </ol>

          <div class="grid gap-4 md:grid-cols-2 xl:flex xl:flex-col">
            <app-chart-card
              [heading]="'result.sourceMix' | t"
              [subtitle]="'result.sourceMixNote' | t: { score: avgCredibility() }"
              [data]="sourceTypesChart()"
              [height]="200"
            />
            <div class="surface-card p-5 text-sm">
              <p class="font-semibold tracking-tight">{{ 'result.method.title' | t }}</p>
              <dl class="mt-3 flex flex-col gap-2 text-xs">
                <div class="flex justify-between gap-3">
                  <dt class="text-muted-foreground">{{ 'result.method.engine' | t }}</dt>
                  <dd class="text-right">{{ r.meta.model ?? ('result.provider.openData' | t) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-muted-foreground">{{ 'result.method.language' | t }}</dt>
                  <dd>{{ r.language.toUpperCase() }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-muted-foreground">{{ 'result.method.confidence' | t }}</dt>
                  <dd>{{ 'result.confidence.' + report.confidence.level | t }}</dd>
                </div>
              </dl>
              <p class="mt-3 text-xs leading-relaxed text-muted-foreground">{{ report.confidence.rationale }}</p>
              @if (r.meta.searchQueries.length) {
                <p class="mt-4 text-xs font-medium">{{ 'result.method.queries' | t }}</p>
                <ul class="mt-2 flex flex-wrap gap-1.5">
                  @for (query of r.meta.searchQueries; track $index) {
                    <li class="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{{ query }}</li>
                  }
                </ul>
              }
              <p class="mt-4 text-[11px] leading-relaxed text-muted-foreground">{{ 'result.disclaimer' | t }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Related -->
      @if (related().length) {
        <section class="surface-card p-6 no-print">
          <h2 class="text-sm font-semibold tracking-tight">{{ 'result.related' | t }}</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (topic of related(); track topic) {
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                (click)="research(topic)"
              >
                <svg appIcon [icon]="icons.Search" class="size-3.5"></svg>{{ topic }}
              </button>
            }
          </div>
        </section>
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .source-ref {
      display: inline-flex;
      align-items: center;
      height: 1.25rem;
      min-width: 1.25rem;
      justify-content: center;
      padding: 0 0.375rem;
      border-radius: 0.375rem;
      background: var(--muted);
      color: var(--muted-foreground);
      font-size: 0.6875rem;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      transition: background-color 0.15s, color 0.15s;
    }
    .source-ref:hover {
      background: var(--foreground);
      color: var(--background);
    }
  `,
})
export class ResultView {
  readonly data = input.required<ResultViewData>();

  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(DataSync);
  private readonly store = inject(ResearchStore);
  private readonly savedActions = inject(SavedActions);

  protected readonly icons = {
    ArrowLeft,
    Bookmark,
    BookmarkCheck,
    Star,
    Trash2,
    Printer,
    Download,
    LoaderCircle,
    ShieldCheck,
    Calendar,
    Clock,
    FileText,
    CircleAlert,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    GraduationCap,
    Scale,
    Lightbulb,
    Plus,
    ExternalLink,
    Search,
    TrendingUp,
    ChartColumn,
    BookOpen,
  };

  protected readonly savedId = linkedSignal(() => this.data().savedSearchId);
  protected readonly favorite = linkedSignal(() => this.data().isFavorite);
  protected readonly saving = signal(false);
  protected readonly highlighted = signal<number | null>(null);
  protected readonly expanded = signal(new Set<number>());

  protected toggleSection(index: number) {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  constructor() {
    trackReadingTime(() => ({ eventId: this.data().eventId, searchId: this.savedId() }));
    effect(() => {
      document.title = `${this.data().result.report.title} · Knowledge Hub`;
    });
  }

  protected readonly navSections = computed<NavSection[]>(() => {
    const { report, enrichment } = this.data().result;
    const sections: NavSection[] = [{ id: 'summary', label: 'result.sections.summary' }];
    if (report.metrics.length) sections.push({ id: 'metrics', label: 'result.sections.metrics' });
    if (report.charts.length) sections.push({ id: 'charts', label: 'result.sections.charts' });
    if (enrichment.interest || enrichment.academic) sections.push({ id: 'pulse', label: 'result.sections.pulse' });
    if (report.keyPoints.length) sections.push({ id: 'insights', label: 'result.sections.insights' });
    if (report.timeline.length || this.hasPerspectives()) sections.push({ id: 'timeline', label: 'result.sections.timeline' });
    if (report.sections.length) sections.push({ id: 'analysis', label: 'result.sections.analysis' });
    sections.push({ id: 'sources', label: 'result.sections.sources' });
    return sections;
  });

  protected readonly hasPerspectives = computed(() => {
    const { consensus, debates } = this.data().result.report.perspectives;
    return consensus.length > 0 || debates.length > 0;
  });

  protected readonly generatedAt = computed(() => formatDate(this.data().result.meta.generatedAt, this.i18n.lang(), 'medium'));
  protected readonly researchTime = computed(() => formatDuration(this.data().result.meta.researchMs, this.i18n.lang()));

  protected readonly warning = computed(() => {
    const warnings = this.data().result.meta.warnings;
    if (warnings.includes('claude_refused')) return 'result.warnings.refused';
    if (warnings.includes('claude_unavailable')) return 'result.warnings.unavailable';
    return null;
  });

  protected readonly confidenceVariant = computed(() => {
    const level = this.data().result.report.confidence.level;
    return level === 'high' ? 'success' : level === 'medium' ? 'secondary' : 'warning';
  });

  protected readonly avgCredibility = computed(() => {
    const sources = this.data().result.sources;
    return sources.length ? Math.round(sources.reduce((sum, source) => sum + source.credibility, 0) / sources.length) : 0;
  });

  protected readonly glance = computed(() => {
    const { report, sources, enrichment } = this.data().result;
    const lang = this.i18n.lang();
    const charts =
      report.charts.length +
      (enrichment.interest ? 1 : 0) +
      (enrichment.academic ? 1 : 0) +
      (enrichment.academic?.countries.length ? 1 : 0) +
      (enrichment.academic?.fields.length ? 1 : 0);
    return [
      { label: 'result.glance.sources', value: formatNumber(sources.length, lang, 0) },
      { label: 'result.glance.credibility', value: `${this.avgCredibility()}/100` },
      { label: 'result.glance.charts', value: formatNumber(charts, lang, 0) },
      { label: 'result.glance.metrics', value: formatNumber(report.metrics.length, lang, 0) },
    ];
  });

  protected readonly reportCharts = computed(() =>
    this.data().result.report.charts.map((chart) => ({
      id: chart.id,
      title: chart.title,
      description: chart.description,
      sourceIds: chart.sourceIds,
      input: { type: chart.type, labels: chart.labels, series: chart.series, unit: chart.unit } satisfies ChartInput,
    })),
  );

  protected readonly interestChart = computed<ChartInput | null>(() => {
    const interest = this.data().result.enrichment.interest;
    if (!interest) return null;
    const lang = this.i18n.lang();
    return {
      type: 'area',
      labels: interest.points.map((point) => formatYearMonth(point.period, lang)),
      series: [{ name: this.i18n.t('result.pulse.views'), data: interest.points.map((point) => point.views) }],
      format: 'compact',
    };
  });

  protected readonly interestSubtitle = computed(() => {
    const interest = this.data().result.enrichment.interest;
    if (!interest) return '';
    const lang = this.i18n.lang();
    const base = this.i18n.t('result.pulse.interestNote', { avg: formatCompact(interest.avgMonthly, lang) });
    return interest.trendPct === null
      ? base
      : `${base} ${this.i18n.t('result.pulse.trend', { pct: signedPercent(interest.trendPct, lang) })}`;
  });

  protected readonly academicChart = computed<ChartInput | null>(() => {
    const academic = this.data().result.enrichment.academic;
    if (!academic?.byYear.length) return null;
    return {
      type: 'bar',
      labels: academic.byYear.map((entry) => String(entry.year)),
      series: [{ name: this.i18n.t('result.pulse.publications'), data: academic.byYear.map((entry) => entry.count) }],
      format: 'compact',
    };
  });

  protected readonly academicSubtitle = computed(() => {
    const academic = this.data().result.enrichment.academic;
    if (!academic) return '';
    const lang = this.i18n.lang();
    const base = this.i18n.t('result.pulse.academicNote', { total: formatCompact(academic.total, lang) });
    return academic.growthPct === null
      ? base
      : `${base} ${this.i18n.t('result.pulse.growth', { pct: signedPercent(academic.growthPct, lang) })}`;
  });

  protected readonly countriesChart = computed<ChartInput | null>(() => {
    const countries = this.data().result.enrichment.academic?.countries ?? [];
    if (countries.length < 2) return null;
    const lang = this.i18n.lang();
    return {
      type: 'horizontalBar',
      labels: countries.map((entry) => countryName(entry.code, entry.name, lang)),
      series: [{ name: this.i18n.t('result.pulse.publications'), data: countries.map((entry) => entry.count) }],
      format: 'compact',
    };
  });

  protected readonly fieldsChart = computed<ChartInput | null>(() => {
    const fields = this.data().result.enrichment.academic?.fields ?? [];
    if (fields.length < 2) return null;
    return {
      type: 'horizontalBar',
      labels: fields.map((entry) => this.i18n.maybe(`fields.${entry.name}`) ?? entry.name),
      series: [{ name: this.i18n.t('result.pulse.publications'), data: fields.map((entry) => entry.count) }],
      format: 'compact',
    };
  });

  protected readonly sourceTypesChart = computed<ChartInput>(() => {
    const counts = new Map<string, number>();
    for (const source of this.data().result.sources) counts.set(source.type, (counts.get(source.type) ?? 0) + 1);
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return {
      type: 'doughnut',
      labels: entries.map(([type]) => this.i18n.t(`sourceTypes.${type}`)),
      series: [{ name: this.i18n.t('result.sections.sources'), data: entries.map(([, count]) => count) }],
    };
  });

  protected readonly maxCitations = computed(() =>
    Math.max(1, ...(this.data().result.enrichment.academic?.topWorks ?? []).map((work) => work.citations)),
  );

  protected readonly related = computed(() => {
    const { report, enrichment } = this.data().result;
    const seen = new Set<string>();
    return [...report.relatedTopics, ...enrichment.related]
      .filter((topic) => {
        const key = topic.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  });

  protected paragraphs(text: string): string[] {
    return text
      .split(/\n{1,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  protected compact(value: number) {
    return formatCompact(value, this.i18n.lang());
  }

  protected favicon(domain: string) {
    return faviconUrl(domain);
  }

  protected credibilityLabel(source: Source) {
    return source.credibility >= 85
      ? 'result.credibility.high'
      : source.credibility >= 70
        ? 'result.credibility.medium'
        : 'result.credibility.low';
  }

  protected scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected goToSource(id: number) {
    this.scrollTo(`source-${id}`);
    this.highlighted.set(id);
    setTimeout(() => {
      if (this.highlighted() === id) this.highlighted.set(null);
    }, 1800);
  }

  protected async save() {
    const eventId = this.data().eventId;
    if (!eventId || this.saving()) return;
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(this.api.saveSearch(eventId));
      this.savedId.set(saved.id);
      this.favorite.set(saved.isFavorite);
      this.store.markSaved(eventId, saved.id);
      this.sync.bump();
      this.toast.success(this.i18n.t('result.savedToast'), this.i18n.t('result.savedToastBody'), {
        label: this.i18n.t('result.openLibrary'),
        run: () => this.router.navigate(['/library']),
      });
    } catch {
      this.toast.error(this.i18n.t('errors.save'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleFavorite() {
    const id = this.savedId();
    if (!id) return;
    const value = await this.savedActions.toggleFavorite({ id, isFavorite: this.favorite() });
    if (value !== null) this.favorite.set(value);
  }

  protected async remove() {
    const id = this.savedId();
    if (!id) return;
    if (await this.savedActions.remove({ id, title: this.data().result.report.title })) {
      this.router.navigate(['/library']);
    }
  }

  protected research(topic: string) {
    this.router.navigate(['/search'], { queryParams: { q: topic } });
  }

  protected print() {
    window.print();
  }

  protected exportJson() {
    const result = this.data().result;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.report.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'research'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
