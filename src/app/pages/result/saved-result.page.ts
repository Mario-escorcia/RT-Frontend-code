import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { API_URL } from '../../core/api.service';
import type { SavedSearch } from '../../core/models';
import { ResultMissing, ResultSkeleton } from './result-pages';
import { ResultView, type ResultViewData } from './result-view';

/** /library/:id — a saved research from the knowledge base. */
@Component({
  selector: 'app-saved-result-page',
  imports: [ResultView, ResultSkeleton, ResultMissing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as data) {
      @for (item of [data]; track item.savedSearchId) {
        <app-result-view [data]="item" />
      }
    } @else if (saved.error()) {
      <app-result-missing backLink="/library" />
    } @else {
      <app-result-skeleton />
    }
  `,
})
export class SavedResultPage {
  readonly id = input.required<string>();

  protected readonly saved = httpResource<SavedSearch>(() => `${API_URL}/searches/${this.id()}`);

  protected readonly view = computed<ResultViewData | null>(() => {
    const saved = this.saved.hasValue() ? this.saved.value() : null;
    if (!saved || saved.id !== this.id()) return null;
    return {
      result: saved.rawData,
      eventId: saved.eventId,
      savedSearchId: saved.id,
      isFavorite: saved.isFavorite,
      viewCount: saved.viewCount,
      savedAt: saved.createdAt,
    };
  });
}
