import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { ConfirmService } from './confirm.service';
import { I18nService } from './i18n/i18n.service';
import type { SavedSearchSummary } from './models';
import { DataSync } from './research.store';
import { ToastService } from './toast.service';

/** Favorite / delete actions shared by the dashboard, the library and the result view. */
@Injectable({ providedIn: 'root' })
export class SavedActions {
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly sync = inject(DataSync);

  async toggleFavorite(item: Pick<SavedSearchSummary, 'id' | 'isFavorite'>): Promise<boolean | null> {
    try {
      const updated = await firstValueFrom(this.api.updateSearch(item.id, { isFavorite: !item.isFavorite }));
      this.sync.bump();
      return updated.isFavorite;
    } catch {
      this.toast.error(this.i18n.t('errors.generic'));
      return null;
    }
  }

  /** Asks for confirmation; resolves true when the item was deleted. */
  async remove(item: Pick<SavedSearchSummary, 'id' | 'title'>): Promise<boolean> {
    const accepted = await this.confirm.ask({
      title: this.i18n.t('library.deleteTitle'),
      description: this.i18n.t('library.deleteDescription', { title: item.title }),
      confirmLabel: this.i18n.t('library.delete'),
      cancelLabel: this.i18n.t('common.cancel'),
      destructive: true,
    });
    if (!accepted) return false;
    try {
      await firstValueFrom(this.api.deleteSearch(item.id));
      this.sync.bump();
      this.toast.success(this.i18n.t('library.deleted'));
      return true;
    } catch {
      this.toast.error(this.i18n.t('errors.generic'));
      return false;
    }
  }
}
