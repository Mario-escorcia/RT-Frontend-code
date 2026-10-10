import { httpResource } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BookOpen, LayoutDashboard, LogOut, Menu, Monitor, Moon, Plus, Search, Sun, X } from 'lucide';
import { filter, map } from 'rxjs';
import { API_URL } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService, TranslatePipe } from '../core/i18n/i18n.service';
import type { Health, SearchList } from '../core/models';
import { DataSync } from '../core/research.store';
import { ThemeService } from '../core/theme.service';
import { UiButton } from '../ui/button';
import { Icon } from '../ui/icon';
import { Logo } from './logo';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    FormsModule,
    Icon,
    UiButton,
    TranslatePipe,
    Logo,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <ng-template #nav>
      <div class="flex h-full flex-col">
        <a routerLink="/" class="flex h-14 items-center gap-2.5 px-5" (click)="menuOpen.set(false)">
          <app-logo class="size-7" />
          <span class="text-[0.9375rem] font-semibold tracking-tight">Knowledge Hub</span>
        </a>

        <div class="px-3 pt-2">
          <a uiBtn routerLink="/search" class="w-full justify-start" (click)="menuOpen.set(false)">
            <svg appIcon [icon]="icons.Plus" class="size-4"></svg>
            {{ 'nav.newSearch' | t }}
          </a>
        </div>

        <nav class="mt-4 flex flex-col gap-0.5 px-3" [attr.aria-label]="'nav.main' | t">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-accent text-foreground"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              (click)="menuOpen.set(false)"
            >
              <svg appIcon [icon]="item.icon" class="size-4"></svg>
              {{ item.label | t }}
              @if (item.path === '/library' && libraryCount() > 0) {
                <span class="ml-auto text-xs tabular text-muted-foreground">{{ libraryCount() }}</span>
              }
            </a>
          }
        </nav>

        @if (recentSaved().length) {
          <div class="mt-6 px-3">
            <p class="eyebrow px-3 pb-2">{{ 'nav.recentSaved' | t }}</p>
            <div class="flex flex-col gap-0.5">
              @for (item of recentSaved(); track item.id) {
                <a
                  [routerLink]="['/library', item.id]"
                  routerLinkActive="bg-accent text-foreground"
                  class="truncate rounded-lg px-3 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  (click)="menuOpen.set(false)"
                >
                  {{ item.title }}
                </a>
              }
            </div>
          </div>
        }

        <div class="mt-auto border-t border-border p-3">
          @if (health.hasValue() ? health.value() : null; as status) {
            <div class="flex items-center gap-2 px-2 pb-3 text-xs text-muted-foreground">
              <span
                class="size-1.5 rounded-full"
                [class]="status.database === 'up' ? 'bg-emerald-500' : 'bg-destructive'"
              ></span>
              <span class="truncate">
                {{ (status.provider === 'claude' ? 'engine.claude' : 'engine.openData') | t }}
              </span>
            </div>
          } @else if (health.error()) {
            <div class="flex items-center gap-2 px-2 pb-3 text-xs text-destructive">
              <span class="size-1.5 rounded-full bg-destructive"></span>
              {{ 'engine.offline' | t }}
            </div>
          }
          @if (auth.user(); as user) {
            <div class="flex items-center gap-3 rounded-lg px-2 py-1.5" [attr.aria-label]="'nav.account' | t">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
                aria-hidden="true"
              >
                {{ auth.initials() }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ user.name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ user.email }}</p>
              </div>
              <button
                uiBtn
                variant="ghost"
                size="icon-sm"
                [title]="'nav.logout' | t"
                [attr.aria-label]="'nav.logout' | t"
                (click)="logout()"
              >
                <svg appIcon [icon]="icons.LogOut" class="size-4"></svg>
              </button>
            </div>
          }
        </div>
      </div>
    </ng-template>

    <!-- Desktop sidebar -->
    <aside class="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card/50 lg:block no-print">
      <ng-container [ngTemplateOutlet]="nav" />
    </aside>

    <!-- Mobile drawer -->
    @if (menuOpen()) {
      <div class="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px]" (click)="menuOpen.set(false)"></div>
        <aside class="absolute inset-y-0 left-0 w-72 animate-fade-up border-r border-border bg-card shadow-2xl">
          <button
            uiBtn
            variant="ghost"
            size="icon-sm"
            class="absolute top-3 right-3"
            [attr.aria-label]="'common.close' | t"
            (click)="menuOpen.set(false)"
          >
            <svg appIcon [icon]="icons.X" class="size-4"></svg>
          </button>
          <ng-container [ngTemplateOutlet]="nav" />
        </aside>
      </div>
    }

    <div class="flex min-h-dvh flex-col lg:pl-64">
      <header class="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl no-print">
        <div class="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <button
            uiBtn
            variant="ghost"
            size="icon-sm"
            class="lg:hidden"
            [attr.aria-label]="'nav.openMenu' | t"
            (click)="menuOpen.set(true)"
          >
            <svg appIcon [icon]="icons.Menu" class="size-4.5"></svg>
          </button>
          <a routerLink="/" class="flex items-center gap-2 lg:hidden">
            <app-logo class="size-6" />
            <span class="hidden text-sm font-semibold tracking-tight min-[400px]:inline">Knowledge Hub</span>
          </a>

          @if (!onSearchPage()) {
            <form class="relative ml-auto hidden w-full max-w-md md:block lg:ml-0" (submit)="quickSearch($event)">
              <svg
                appIcon
                [icon]="icons.Search"
                class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              ></svg>
              <input
                #quickInput
                name="q"
                [(ngModel)]="quickQuery"
                [placeholder]="'nav.quickSearch' | t"
                autocomplete="off"
                class="h-9 w-full rounded-lg border border-input bg-card pr-12 pl-9 text-sm shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
              <kbd
                class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground"
              >
                /
              </kbd>
            </form>
          }

          <div class="ml-auto flex items-center gap-1">
            <a uiBtn variant="ghost" size="icon-sm" routerLink="/search" class="md:hidden" [attr.aria-label]="'nav.newSearch' | t">
              <svg appIcon [icon]="icons.Search" class="size-4"></svg>
            </a>
            <button
              uiBtn
              variant="ghost"
              size="sm"
              class="w-10 font-mono text-xs"
              [attr.aria-label]="'nav.language' | t"
              [title]="'nav.language' | t"
              (click)="i18n.toggle()"
            >
              {{ i18n.lang() === 'es' ? 'ES' : 'EN' }}
            </button>
            <button
              uiBtn
              variant="ghost"
              size="icon-sm"
              [attr.aria-label]="themeLabel() | t"
              [title]="themeLabel() | t"
              (click)="theme.toggle()"
            >
              <svg appIcon [icon]="themeIcon()" class="size-4"></svg>
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly sync = inject(DataSync);

  protected readonly auth = inject(AuthService);
  protected readonly icons = { Plus, Menu, X, Search, Sun, Moon, Monitor, LogOut };
  protected readonly navItems = [
    { path: '/', label: 'nav.dashboard', icon: LayoutDashboard, exact: true },
    { path: '/search', label: 'nav.search', icon: Search, exact: false },
    { path: '/library', label: 'nav.library', icon: BookOpen, exact: false },
  ];

  protected readonly menuOpen = signal(false);
  protected quickQuery = '';
  private readonly quickInput = viewChild<ElementRef<HTMLInputElement>>('quickInput');

  protected readonly health = httpResource<Health>(() => `${API_URL}/health`);
  private readonly library = httpResource<SearchList>(() => {
    this.sync.version();
    return { url: `${API_URL}/searches`, params: { limit: 5 } };
  });
  // value() throws while a resource is in error state, so always check hasValue() first.
  protected readonly recentSaved = computed(() => (this.library.hasValue() ? this.library.value().items : []));
  protected readonly libraryCount = computed(() => (this.library.hasValue() ? this.library.value().total : 0));

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly onSearchPage = computed(() => this.url().startsWith('/search'));

  protected readonly themeIcon = computed(() =>
    this.theme.preference() === 'system' ? this.icons.Monitor : this.theme.preference() === 'dark' ? this.icons.Moon : this.icons.Sun,
  );
  protected readonly themeLabel = computed(() => `theme.${this.theme.preference()}`);

  protected logout() {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  protected quickSearch(event: Event) {
    event.preventDefault();
    const q = this.quickQuery.trim();
    if (q.length < 2) return;
    this.quickQuery = '';
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if ((event.key === '/' && !typing) || (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey))) {
      const input = this.quickInput()?.nativeElement;
      if (input) {
        event.preventDefault();
        input.focus();
      }
    }
    if (event.key === 'Escape') this.menuOpen.set(false);
  }
}
