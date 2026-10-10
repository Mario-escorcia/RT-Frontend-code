import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  EventSummary,
  Lang,
  ResearchPayload,
  ResearchStreamEvent,
  SavedSearch,
  SavedSearchSummary,
} from './models';

export const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  recentEvents(limit = 8) {
    return this.http.get<EventSummary[]>(`${API_URL}/events`, { params: { limit } });
  }

  event(id: string) {
    return this.http.get<ResearchPayload>(`${API_URL}/events/${id}`);
  }

  saveSearch(eventId: string, tags: string[] = []) {
    return this.http.post<SavedSearchSummary>(`${API_URL}/searches`, { eventId, tags });
  }

  getSearch(id: string) {
    return this.http.get<SavedSearch>(`${API_URL}/searches/${id}`);
  }

  updateSearch(id: string, changes: { isFavorite?: boolean; tags?: string[] }) {
    return this.http.patch<SavedSearchSummary>(`${API_URL}/searches/${id}`, changes);
  }

  deleteSearch(id: string) {
    return this.http.delete<void>(`${API_URL}/searches/${id}`);
  }

  /** Reading time; uses sendBeacon so it also works while the tab is closing. */
  logReading(durationMs: number, refs: { eventId?: string | null; searchId?: string | null }) {
    const body = JSON.stringify({ durationMs: Math.round(durationMs), ...refs });
    const url = `${API_URL}/activity`;
    if (!navigator.sendBeacon?.(url, body)) {
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(
        () => undefined,
      );
    }
  }

  /** Live research over Server-Sent Events. Unsubscribing closes the stream (and cancels server work). */
  research(topic: string, lang: Lang): Observable<ResearchStreamEvent> {
    return new Observable<ResearchStreamEvent>((subscriber) => {
      const params = new URLSearchParams({ q: topic, lang });
      const source = new EventSource(`${API_URL}/research/stream?${params}`, { withCredentials: true });
      let finished = false;

      const parse = (event: MessageEvent<string>) => {
        try {
          return JSON.parse(event.data);
        } catch {
          return null;
        }
      };

      source.addEventListener('progress', (event) => {
        const data = parse(event as MessageEvent<string>);
        if (data) subscriber.next({ type: 'progress', data });
      });
      source.addEventListener('result', (event) => {
        const data = parse(event as MessageEvent<string>);
        finished = true;
        source.close();
        if (data) subscriber.next({ type: 'result', data });
        subscriber.complete();
      });
      // Server-sent "error" events carry a JSON body; native connection errors do not.
      source.addEventListener('error', (event) => {
        if (finished) return;
        finished = true;
        source.close();
        const data = 'data' in event && typeof event.data === 'string' ? parse(event as MessageEvent<string>) : null;
        subscriber.next({
          type: 'error',
          data: data ?? { code: 'connection_error', message: 'Connection to the research service was lost.' },
        });
        subscriber.complete();
      });

      return () => source.close();
    });
  }
}
