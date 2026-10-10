import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookOpen, Plus, Search, Star, X } from 'lucide';
import { API_URL } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import type { Category, SavedSearchSummary, SearchList } from '../../core/models';
import { DataSync } from '../../core/research.store';
import { SavedActions } from '../../core/saved-actions';
import { UiButton } from '../../ui/button';
import { Icon } from '../../ui/icon';
import { SavedCard } from './saved-card';

type Sort = 'recent' | 'oldest' | 'views' | 'title';
const PAGE_SIZE = 24;

@Component({
  selector: 'app-library-page',
  imports: [RouterLink, FormsModule, Icon, UiButton, TranslatePipe, SavedCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
        <div>
          <p class="eyebrow">{{ 'library.eyebrow' | t }}</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{{ 'library.title' | t }}</h1>
          <p class="mt-2 text-[0.9375rem] text-muted-foreground">
            {{ 'library.subtitle' | t: { n: total() } }}
          </p>
        </div>
        <a uiBtn routerLink="/search"><svg appIcon [icon]="icons.Plus" class="size-4"></svg>{{ 'nav.newSearch' | t }}</a>
      </header>

      <div class="flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <svg
            appIcon
            [icon]="icons.Search"
            class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          ></svg>
          <input
            [ngModel]="rawQuery()"
            (ngModelChange)="rawQuery.set($event)"
            [placeholder]="'library.searchPlaceholder' | t"
            class="h-10 w-full rounded-lg border border-input bg-card pr-9 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
          @if (rawQuery()) {
            <button
              type="button"
              class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              [attr.aria-label]="'common.clear' | t"
              (click)="rawQuery.set('')"
            >
              <svg appIcon [icon]="icons.X" class="size-3.5"></svg>
            </button>
          }
        </div>
        <div class="flex gap-2">
          <button
            uiBtn
            variant="outline"
            class="h-10"
            [class.border-foreground]="favorites()"
            [attr.aria-pressed]="favorites()"
            (click)="favorites.update((value) => !value)"
          >
            <svg appIcon [icon]="icons.Star" class="size-4" [class.fill-current]="favorites()" [class.text-amber-500]="favorites()"></svg>
            {{ 'library.favorites' | t }}
          </button>
          <label class="relative">
            <span class="sr-only">{{ 'library.sort.label' | t }}</span>
            <select
              [ngModel]="sort()"
              (ngModelChange)="sort.set($event)"
              class="h-10 appearance-none rounded-lg border border-input bg-card pr-8 pl-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            >
              @for (option of sortOptions; track option) {
                <option [value]="option">{{ 'library.sort.' + option | t }}</option>
              }
            </select>
            <span class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-muted-foreground">▼</span>
          </label>
        </div>
      </div>

      @if (categories().length > 1) {
        <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button type="button" class="chip" [class.chip-active]="!category()" (click)="category.set(null)">
            {{ 'library.allCategories' | t }}
          </button>
          @for (entry of categories(); track entry.category) {
            <button
              type="button"
              class="chip"
              [class.chip-active]="category() === entry.category"
              (click)="category.set(category() === entry.category ? null : entry.category)"
            >
              {{ 'categories.' + entry.category | t }}
              <span class="tabular opacity-60">{{ entry.count }}</span>
            </button>
          }
        </div>
      }

      @if (list.error()) {
        <div class="surface-card p-10 text-center">
          <p class="font-medium">{{ 'errors.loadLibrary' | t }}</p>
          <button uiBtn variant="outline" size="sm" class="mt-3" (click)="list.reload()">{{ 'common.retry' | t }}</button>
        </div>
      } @else if (items() === undefined) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="h-52 rounded-xl animate-shimmer"></div>
          }
        </div>
      } @else if (items()!.length === 0) {
        <div class="surface-card flex flex-col items-center gap-3 border-dashed px-6 py-16 text-center">
          <span class="flex size-11 items-center justify-center rounded-xl bg-muted">
            <svg appIcon [icon]="icons.BookOpen" class="size-5"></svg>
          </span>
          @if (hasFilters()) {
            <p class="font-medium">{{ 'library.noMatches' | t }}</p>
            <button uiBtn variant="outline" size="sm" (click)="clearFilters()">{{ 'library.clearFilters' | t }}</button>
          } @else {
            <p class="font-medium">{{ 'library.empty.title' | t }}</p>
            <p class="max-w-sm text-sm text-muted-foreground">{{ 'library.empty.description' | t }}</p>
            <a uiBtn routerLink="/search" class="mt-2">{{ 'nav.newSearch' | t }}</a>
          }
        </div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" [class.opacity-60]="list.isLoading()">
          @for (item of items(); track item.id) {
            <app-saved-card [item]="item" [removable]="true" (favorite)="toggleFavorite($event)" (remove)="remove($event)" />
          }
        </div>
        @if (items()!.length < total()) {
          <div class="flex justify-center">
            <button uiBtn variant="outline" [disabled]="list.isLoading()" (click)="limit.update((value) => value + pageSize)">
              {{ 'library.loadMore' | t: { n: total() - items()!.length } }}
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      flex-shrink: 0;
      height: 2rem;
      padding: 0 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--muted-foreground);
      font-size: 0.8125rem;
      transition: color 0.15s, border-color 0.15s, background-color 0.15s;
    }
    .chip:hover {
      color: var(--foreground);
    }
    .chip-active {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--primary-foreground);
    }
    .chip-active:hover {
      color: var(--primary-foreground);
    }
  `,
})
export class LibraryPage {
  private readonly sync = inject(DataSync);
  private readonly savedActions = inject(SavedActions);

  protected readonly icons = { Plus, Search, Star, X, BookOpen };
  protected readonly sortOptions: Sort[] = ['recent', 'oldest', 'views', 'title'];
  protected readonly pageSize = PAGE_SIZE;

  protected readonly rawQuery = signal('');
  private readonly query = signal('');
  protected readonly category = signal<Category | null>(null);
  protected readonly favorites = signal(false);
  protected readonly sort = signal<Sort>('recent');
  protected readonly limit = signal(PAGE_SIZE);

  protected readonly list = httpResource<SearchList>(() => {
    this.sync.version();
    const params: Record<string, string | number> = { sort: this.sort(), limit: this.limit(), offset: 0 };
    if (this.query()) params['q'] = this.query();
    if (this.category()) params['category'] = this.category()!;
    if (this.favorites()) params['favorite'] = 'true';
    return { url: `${API_URL}/searches`, params };
  });

  /** Keeps the previous page on screen while a new request loads. */
  private readonly lastList = linkedSignal<SearchList | undefined, SearchList | undefined>({
    source: () => (this.list.hasValue() ? this.list.value() : undefined),
    computation: (value, previous) => value ?? previous?.value,
  });
  protected readonly items = computed(() => this.lastList()?.items);
  protected readonly total = computed(() => this.lastList()?.total ?? 0);
  protected readonly categories = computed(() => this.lastList()?.categories ?? []);
  protected readonly hasFilters = computed(() => Boolean(this.query() || this.category() || this.favorites()));

  constructor() {
    // Debounce the text filter.
    effect((onCleanup) => {
      const value = this.rawQuery().trim();
      const timer = setTimeout(() => {
        this.query.set(value);
        this.limit.set(PAGE_SIZE);
      }, 300);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected clearFilters() {
    this.rawQuery.set('');
    this.query.set('');
    this.category.set(null);
    this.favorites.set(false);
  }

  protected async toggleFavorite(item: SavedSearchSummary) {
    await this.savedActions.toggleFavorite(item);
  }

  protected async remove(item: SavedSearchSummary) {
    await this.savedActions.remove(item);
  }
}
