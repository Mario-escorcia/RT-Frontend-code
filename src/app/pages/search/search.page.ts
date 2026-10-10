import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ArrowRight,
  BookmarkCheck,
  ChartNoAxesCombined,
  Check,
  CircleAlert,
  Globe,
  History,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide';
import { API_URL } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { faviconUrl, relativeTime } from '../../core/format';
import { I18nService, TranslatePipe } from '../../core/i18n/i18n.service';
import type { EventSummary, Health } from '../../core/models';
import { ResearchStore } from '../../core/research.store';
import { SUGGESTIONS } from '../../core/suggestions';
import { UiButton } from '../../ui/button';
import { Icon } from '../../ui/icon';

@Component({
  selector: 'app-search-page',
  imports: [FormsModule, Icon, UiButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.status() === 'running') {
      <!-- Live research -->
      <section class="mx-auto max-w-3xl animate-fade-up" aria-live="polite">
        <div class="surface-card overflow-hidden">
          <div class="h-1 w-full bg-muted">
            <div
              class="h-full bg-foreground transition-[width] duration-700 ease-out"
              [style.width.%]="store.percent()"
            ></div>
          </div>
          <div class="p-6 sm:p-8">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="eyebrow">{{ 'search.running.eyebrow' | t }}</p>
                <h1 class="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{{ store.topic() }}</h1>
                <p class="mt-2 text-sm text-muted-foreground tabular">
                  {{ 'search.running.elapsed' | t: { s: elapsed() } }} · {{ store.percent() }}%
                </p>
              </div>
              <button uiBtn variant="outline" size="sm" (click)="cancel()">
                <svg appIcon [icon]="icons.X" class="size-3.5"></svg>{{ 'common.cancel' | t }}
              </button>
            </div>

            <ol class="mt-8 flex flex-col gap-4">
              @for (step of steps; track step; let index = $index) {
                <li class="flex items-center gap-3">
                  <span
                    class="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors"
                    [class]="
                      index < store.step()
                        ? 'border-foreground bg-foreground text-background'
                        : index === store.step()
                          ? 'border-foreground text-foreground'
                          : 'border-border text-muted-foreground'
                    "
                  >
                    @if (index < store.step()) {
                      <svg appIcon [icon]="icons.Check" class="size-3.5" [strokeWidth]="2.5"></svg>
                    } @else if (index === store.step()) {
                      <svg appIcon [icon]="icons.LoaderCircle" class="size-3.5 animate-spin"></svg>
                    } @else {
                      {{ index + 1 }}
                    }
                  </span>
                  <span
                    class="text-sm"
                    [class.text-muted-foreground]="index > store.step()"
                    [class.font-medium]="index === store.step()"
                  >
                    {{ step | t }}
                  </span>
                </li>
              }
            </ol>

            @if (store.queries().length) {
              <div class="mt-8">
                <p class="eyebrow">{{ 'search.running.queries' | t }}</p>
                <ul class="mt-3 flex flex-wrap gap-2">
                  @for (query of store.queries(); track $index) {
                    <li class="inline-flex animate-fade-up items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
                      <svg appIcon [icon]="icons.Search" class="size-3 text-muted-foreground"></svg>{{ query }}
                    </li>
                  }
                </ul>
              </div>
            }

            @if (store.sources().length) {
              <div class="mt-8">
                <p class="eyebrow">{{ 'search.running.sources' | t: { n: store.sources().length } }}</p>
                <ul class="mt-3 grid gap-2 sm:grid-cols-2">
                  @for (source of store.sources(); track source.url) {
                    <li class="flex animate-fade-up items-center gap-2.5 rounded-lg border border-border px-3 py-2">
                      <img [src]="favicon(source.domain)" alt="" class="size-4 rounded-sm" loading="lazy" />
                      <span class="min-w-0">
                        <span class="block truncate text-xs font-medium">{{ source.title }}</span>
                        <span class="block truncate text-[11px] text-muted-foreground">{{ source.domain }}</span>
                      </span>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
        <p class="mt-4 text-center text-xs text-muted-foreground">{{ 'search.running.hint' | t }}</p>
      </section>
    } @else {
      <!-- Search form -->
      <section class="mx-auto flex max-w-3xl flex-col items-center pt-6 text-center sm:pt-14 animate-fade-up">
        <span class="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
          <svg appIcon [icon]="icons.Sparkles" class="size-5"></svg>
        </span>
        <h1 class="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{{ 'search.title' | t }}</h1>
        <p class="mt-4 max-w-xl text-[0.9375rem] text-muted-foreground text-pretty">{{ 'search.subtitle' | t }}</p>

        @if (store.status() === 'error' && store.error(); as error) {
          <div
            class="mt-8 flex w-full items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left"
            role="alert"
          >
            <svg appIcon [icon]="icons.CircleAlert" class="mt-0.5 size-4 text-destructive"></svg>
            <div class="flex-1">
              <p class="text-sm font-medium">{{ errorTitle(error.code) | t }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ error.message }}</p>
            </div>
            <button uiBtn variant="outline" size="sm" (click)="retry()">{{ 'common.retry' | t }}</button>
          </div>
        }

        <form class="mt-8 w-full" (submit)="submit($event)">
          <div
            class="flex items-center gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15"
          >
            <svg appIcon [icon]="icons.Search" class="ml-2 size-5 text-muted-foreground"></svg>
            <input
              #input
              name="topic"
              [(ngModel)]="topic"
              [placeholder]="'search.placeholder' | t"
              autocomplete="off"
              maxlength="200"
              class="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <button uiBtn size="lg" type="submit" class="rounded-xl" [disabled]="topic.trim().length < 2">
              <span class="hidden sm:inline">{{ 'search.submit' | t }}</span>
              <svg appIcon [icon]="icons.ArrowRight" class="size-4"></svg>
            </button>
          </div>
        </form>

        <div class="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <svg appIcon [icon]="icons.Globe" class="size-3.5"></svg>
            {{ 'search.languageHint' | t }}
          </span>
          @if (health.hasValue() ? health.value() : null; as status) {
            <span aria-hidden="true">·</span>
            <span>{{ (status.provider === 'claude' ? 'engine.claudeLong' : 'engine.openDataLong') | t }}</span>
          }
        </div>

        <div class="mt-10 w-full text-left">
          <p class="eyebrow">{{ 'search.suggestions' | t }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (suggestion of suggestions(); track suggestion) {
              <button
                type="button"
                class="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                (click)="start(suggestion)"
              >
                {{ suggestion }}
              </button>
            }
          </div>

          @if (recentEvents().length) {
            <p class="eyebrow mt-8">{{ 'search.recent' | t }}</p>
            <ul class="mt-3 grid gap-2 sm:grid-cols-2">
              @for (event of recentEvents(); track event.id) {
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left transition-colors hover:border-foreground/25"
                    (click)="openEvent(event)"
                  >
                    <svg
                      appIcon
                      [icon]="event.savedSearchId ? icons.BookmarkCheck : icons.History"
                      class="size-4 text-muted-foreground"
                    ></svg>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm">{{ event.topic }}</span>
                      <span class="block text-xs text-muted-foreground">{{ ago(event.createdAt) }}</span>
                    </span>
                  </button>
                </li>
              }
            </ul>
          }

          <div class="mt-12 grid gap-4 sm:grid-cols-3">
            @for (feature of features; track feature.title) {
              <div class="rounded-xl border border-border p-4">
                <svg appIcon [icon]="feature.icon" class="size-4"></svg>
                <p class="mt-3 text-sm font-medium">{{ feature.title | t }}</p>
                <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ feature.body | t }}</p>
              </div>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class SearchPage {
  /** ?q= query param (router input binding). */
  readonly q = input<string>();

  protected readonly store = inject(ResearchStore);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input');

  protected readonly icons = {
    Search,
    Sparkles,
    ArrowRight,
    X,
    Check,
    LoaderCircle,
    Globe,
    CircleAlert,
    History,
    BookmarkCheck,
  };
  protected readonly steps = ['search.steps.find', 'search.steps.verify', 'search.steps.analyze', 'search.steps.visualize'];
  protected readonly features = [
    { icon: ShieldCheck, title: 'search.features.sources.title', body: 'search.features.sources.body' },
    { icon: ChartNoAxesCombined, title: 'search.features.charts.title', body: 'search.features.charts.body' },
    { icon: BookmarkCheck, title: 'search.features.save.title', body: 'search.features.save.body' },
  ];

  protected topic = '';
  private readonly now = signal(Date.now());
  protected readonly elapsed = computed(() => {
    const started = this.store.startedAt();
    return started ? Math.max(0, Math.round((this.now() - started) / 1000)) : 0;
  });
  protected readonly suggestions = computed(() => SUGGESTIONS[this.i18n.lang()]);
  protected readonly health = httpResource<Health>(() => `${API_URL}/health`);
  private readonly recent = httpResource<EventSummary[]>(() => ({ url: `${API_URL}/events`, params: { limit: 6 } }));
  protected readonly recentEvents = computed(() => (this.recent.hasValue() ? this.recent.value() : []));

  constructor() {
    // A finished research from a previous visit should not redirect again.
    if (this.store.status() === 'done') this.store.reset();

    effect(() => {
      const q = this.q()?.trim();
      if (!q || q.length < 2) return;
      untracked(() => {
        const alreadyRunning = this.store.status() === 'running' && this.store.topic() === q;
        if (!alreadyRunning) this.start(q);
      });
    });

    // Expired session during a research: back to the login screen.
    effect(() => {
      if (this.store.error()?.code === 'unauthorized') untracked(() => this.auth.handleUnauthorized());
    });

    effect(() => {
      const payload = this.store.payload();
      if (this.store.status() === 'done' && payload) {
        untracked(() => this.router.navigate(['/research', payload.eventId], { replaceUrl: true }));
      }
    });

    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected submit(event: Event) {
    event.preventDefault();
    this.start(this.topic);
  }

  protected start(topic: string) {
    const clean = topic.trim();
    if (clean.length < 2) return;
    this.topic = clean;
    this.store.start(clean, this.i18n.lang());
  }

  protected retry() {
    this.start(this.store.topic() || this.topic);
  }

  protected cancel() {
    this.store.cancel();
    setTimeout(() => this.inputRef()?.nativeElement.focus());
  }

  protected errorTitle(code: string) {
    return this.i18n.maybe(`errors.research.${code}`) ? `errors.research.${code}` : 'errors.research.generic';
  }

  protected favicon(domain: string) {
    return faviconUrl(domain);
  }

  protected ago(value: string) {
    return relativeTime(value, this.i18n.lang());
  }

  protected openEvent(event: EventSummary) {
    this.router.navigate(event.savedSearchId ? ['/library', event.savedSearchId] : ['/research', event.id]);
  }
}
