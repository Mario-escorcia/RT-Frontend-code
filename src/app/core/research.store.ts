import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from './api.service';
import type { Lang, ProgressStage, ResearchPayload } from './models';

export type ResearchStatus = 'idle' | 'running' | 'done' | 'error';

interface FoundSource {
  title: string;
  url: string;
  domain: string;
}

/** Bumped whenever saved knowledge changes, so lists and stats refetch. */
@Injectable({ providedIn: 'root' })
export class DataSync {
  readonly version = signal(0);
  bump() {
    this.version.update((value) => value + 1);
  }
}

/** State of the live research (kept across navigation so the result opens instantly). */
@Injectable({ providedIn: 'root' })
export class ResearchStore {
  private readonly api = inject(ApiService);
  private readonly sync = inject(DataSync);
  private subscription: Subscription | null = null;

  readonly status = signal<ResearchStatus>('idle');
  readonly topic = signal('');
  readonly percent = signal(0);
  readonly stage = signal<ProgressStage | null>(null);
  readonly queries = signal<string[]>([]);
  readonly sources = signal<FoundSource[]>([]);
  readonly error = signal<{ code: string; message: string } | null>(null);
  readonly startedAt = signal<number | null>(null);
  readonly payload = signal<ResearchPayload | null>(null);

  /** 0..3 — index in the four-step progress list shown to the user. */
  readonly step = computed(() => {
    switch (this.stage()) {
      case 'sources':
        return 1;
      case 'analyzing':
      case 'structuring':
        return 2;
      case 'finalizing':
        return 3;
      default:
        return 0;
    }
  });

  start(topic: string, lang: Lang) {
    this.cancel();
    this.topic.set(topic);
    this.status.set('running');
    this.percent.set(2);
    this.stage.set('start');
    this.queries.set([]);
    this.sources.set([]);
    this.error.set(null);
    this.payload.set(null);
    this.startedAt.set(Date.now());

    this.subscription = this.api.research(topic, lang).subscribe((event) => {
      if (event.type === 'progress') {
        const { stage, percent, query, sources } = event.data;
        this.stage.set(stage);
        this.percent.update((current) => Math.max(current, percent));
        if (query) this.queries.update((list) => [...list, query]);
        if (sources?.length) {
          this.sources.update((list) => {
            const known = new Set(list.map((source) => source.url));
            return [...list, ...sources.filter((source) => !known.has(source.url))].slice(0, 30);
          });
        }
      } else if (event.type === 'result') {
        this.percent.set(100);
        this.payload.set(event.data);
        this.status.set('done');
        this.sync.bump();
      } else {
        this.error.set(event.data);
        this.status.set('error');
      }
    });
  }

  cancel() {
    this.subscription?.unsubscribe();
    this.subscription = null;
    if (this.status() === 'running') this.status.set('idle');
  }

  reset() {
    this.cancel();
    this.status.set('idle');
    this.payload.set(null);
    this.error.set(null);
  }

  markSaved(eventId: string, savedSearchId: string) {
    const payload = this.payload();
    if (payload?.eventId === eventId) this.payload.set({ ...payload, savedSearchId });
  }
}
