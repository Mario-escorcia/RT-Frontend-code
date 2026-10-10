import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, untracked } from '@angular/core';
import { API_URL } from '../../core/api.service';
import type { ResearchPayload } from '../../core/models';
import { ResearchStore } from '../../core/research.store';
import { ResultMissing, ResultSkeleton } from './result-pages';
import { ResultView, type ResultViewData } from './result-view';

/** /research/:eventId — a fresh (or past, unsaved) research result. */
@Component({
  selector: 'app-research-result-page',
  imports: [ResultView, ResultSkeleton, ResultMissing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as data) {
      @for (item of [data]; track item.eventId) {
        <app-result-view [data]="item" />
      }
    } @else if (remote.error()) {
      <app-result-missing backLink="/search" />
    } @else {
      <app-result-skeleton />
    }
  `,
})
export class ResearchResultPage {
  readonly eventId = input.required<string>();
  private readonly store = inject(ResearchStore);

  /** Only hits the API when the result is not already in memory from the live research. */
  protected readonly remote = httpResource<ResearchPayload>(() => {
    const id = this.eventId();
    const local = untracked(() => this.store.payload());
    return local?.eventId === id ? undefined : `${API_URL}/events/${id}`;
  });

  private readonly payload = computed(() => {
    const local = this.store.payload();
    if (local?.eventId === this.eventId()) return local;
    return this.remote.hasValue() ? this.remote.value() : null;
  });

  protected readonly view = computed<ResultViewData | null>(() => {
    const payload = this.payload();
    return payload
      ? {
          result: payload.result,
          eventId: payload.eventId,
          savedSearchId: payload.savedSearchId,
          isFavorite: false,
          viewCount: null,
          savedAt: null,
        }
      : null;
  });
}
