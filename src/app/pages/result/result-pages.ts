import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import { UiButton } from '../../ui/button';

/** Skeleton shown while a result loads. */
@Component({
  selector: 'app-result-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6" aria-busy="true">
      <div class="h-8 w-40 rounded-lg animate-shimmer"></div>
      <div class="h-12 w-3/4 rounded-lg animate-shimmer"></div>
      <div class="h-5 w-2/3 rounded-lg animate-shimmer"></div>
      <div class="grid gap-4 sm:grid-cols-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="h-32 rounded-xl animate-shimmer"></div>
        }
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="h-72 rounded-xl animate-shimmer"></div>
        <div class="h-72 rounded-xl animate-shimmer"></div>
      </div>
    </div>
  `,
})
export class ResultSkeleton {}

/** Not-found / error state for result pages. */
@Component({
  selector: 'app-result-missing',
  imports: [RouterLink, UiButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="surface-card mx-auto flex max-w-lg flex-col items-center gap-3 p-10 text-center">
      <p class="text-lg font-semibold tracking-tight">{{ 'result.missing.title' | t }}</p>
      <p class="text-sm text-muted-foreground">{{ 'result.missing.description' | t }}</p>
      <div class="mt-2 flex gap-2">
        <a uiBtn variant="outline" [routerLink]="backLink()">{{ 'common.back' | t }}</a>
        <a uiBtn routerLink="/search">{{ 'nav.newSearch' | t }}</a>
      </div>
    </div>
  `,
})
export class ResultMissing {
  readonly backLink = input('/');
}
