import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartColumn, Eye, FileText, Star, Trash2 } from 'lucide';
import { formatDate, relativeTime } from '../../core/format';
import { I18nService, TranslatePipe } from '../../core/i18n/i18n.service';
import type { SavedSearchSummary } from '../../core/models';
import { UiBadge } from '../../ui/button';
import { Icon } from '../../ui/icon';

/** Card for a saved research (dashboard quick access + library grid). */
@Component({
  selector: 'app-saved-card',
  imports: [RouterLink, Icon, UiBadge, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let s = item();
    <article
      class="group surface-card relative flex h-full flex-col p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/40"
    >
      <div class="flex items-center justify-between gap-2">
        <span uiBadge variant="outline">{{ 'categories.' + (s.category ?? 'other') | t }}</span>
        <div class="relative z-10 flex items-center gap-0.5">
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
            [class.text-amber-500]="s.isFavorite"
            [class.text-muted-foreground]="!s.isFavorite"
            [attr.aria-pressed]="s.isFavorite"
            [attr.aria-label]="(s.isFavorite ? 'library.unfavorite' : 'library.favorite') | t"
            (click)="favorite.emit(s)"
          >
            <svg appIcon [icon]="icons.Star" class="size-3.5" [class.fill-current]="s.isFavorite"></svg>
          </button>
          @if (removable()) {
            <button
              type="button"
              class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-100 transition hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
              [attr.aria-label]="'library.delete' | t"
              (click)="remove.emit(s)"
            >
              <svg appIcon [icon]="icons.Trash2" class="size-3.5"></svg>
            </button>
          }
        </div>
      </div>

      <h3 class="mt-3 line-clamp-2 font-semibold tracking-tight text-balance">
        <a [routerLink]="['/library', s.id]" class="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
          {{ s.title }}
        </a>
      </h3>
      <p class="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{{ s.tldr || s.summary }}</p>

      @if (s.tags.length) {
        <div class="mt-3 flex flex-wrap gap-1">
          @for (tag of s.tags.slice(0, 3); track tag) {
            <span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">#{{ tag }}</span>
          }
        </div>
      }

      <div class="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1" [title]="'library.sources' | t">
          <svg appIcon [icon]="icons.FileText" class="size-3.5"></svg>{{ s.sourceCount }}
        </span>
        <span class="inline-flex items-center gap-1" [title]="'library.charts' | t">
          <svg appIcon [icon]="icons.ChartColumn" class="size-3.5"></svg>{{ s.chartCount }}
        </span>
        <span class="inline-flex items-center gap-1" [title]="'library.views' | t">
          <svg appIcon [icon]="icons.Eye" class="size-3.5"></svg>{{ s.viewCount }}
        </span>
        <span class="ml-auto" [title]="date(s.createdAt)">{{ ago(s.createdAt) }}</span>
      </div>
    </article>
  `,
})
export class SavedCard {
  readonly item = input.required<SavedSearchSummary>();
  readonly removable = input(false);
  readonly favorite = output<SavedSearchSummary>();
  readonly remove = output<SavedSearchSummary>();

  private readonly i18n = inject(I18nService);
  protected readonly icons = { Star, Trash2, FileText, ChartColumn, Eye };

  protected ago(value: string) {
    return relativeTime(value, this.i18n.lang());
  }

  protected date(value: string) {
    return formatDate(value, this.i18n.lang());
  }
}
