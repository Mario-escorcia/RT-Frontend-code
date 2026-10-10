import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Check, Monitor, Moon, Sun } from 'lucide';
import { I18nService, TranslatePipe } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme.service';
import { Logo } from '../../layout/logo';
import { UiButton } from '../../ui/button';
import { Icon } from '../../ui/icon';

/** Split screen for login/register: brand panel (always black & white) + form. */
@Component({
  selector: 'app-auth-layout',
  imports: [Logo, Icon, UiButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <!-- "dark" scopes the dark tokens to this panel in both themes -->
      <aside class="dark relative hidden overflow-hidden bg-black p-10 text-foreground lg:flex lg:flex-col">
        <div
          class="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]"
        ></div>
        <div class="relative flex items-center gap-2.5">
          <app-logo class="size-8" />
          <span class="text-[0.9375rem] font-semibold tracking-tight">Knowledge Hub</span>
        </div>

        <div class="relative mt-auto max-w-md">
          <h1 class="text-4xl leading-[1.1] font-semibold tracking-tight text-balance">{{ 'auth.tagline' | t }}</h1>
          <p class="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">{{ 'auth.taglineSub' | t }}</p>

          <!-- Decorative preview of the dashboard (illustration, no data) -->
          <div class="mt-10 rounded-xl border border-border bg-card/60 p-5 backdrop-blur" aria-hidden="true">
            <div class="flex items-center justify-between">
              <span class="h-2 w-24 rounded-full bg-muted-foreground/40"></span>
              <span class="h-2 w-10 rounded-full bg-muted-foreground/25"></span>
            </div>
            <div class="mt-5 flex h-24 items-end gap-1.5">
              @for (height of bars; track $index) {
                <span class="flex-1 rounded-t-[3px] bg-foreground" [style.height.%]="height" [style.opacity]="0.25 + height / 140"></span>
              }
            </div>
          </div>

          <ul class="mt-8 flex flex-col gap-3 text-sm text-muted-foreground">
            @for (feature of features; track feature) {
              <li class="flex items-center gap-2.5">
                <span class="flex size-5 items-center justify-center rounded-full border border-border">
                  <svg appIcon [icon]="icons.Check" class="size-3 text-foreground" [strokeWidth]="2.5"></svg>
                </span>
                {{ feature | t }}
              </li>
            }
          </ul>
        </div>
        <p class="relative mt-12 text-xs text-muted-foreground">© {{ year }} Knowledge Hub</p>
      </aside>

      <main class="flex min-h-dvh flex-col bg-background">
        <div class="flex items-center justify-between p-4 sm:p-6">
          <div class="flex items-center gap-2 lg:invisible">
            <app-logo class="size-7" />
            <span class="text-sm font-semibold tracking-tight">Knowledge Hub</span>
          </div>
          <div class="flex items-center gap-1">
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
        <div class="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div class="w-full max-w-sm animate-fade-up">
            <ng-content />
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AuthLayout {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly icons = { Check, Sun, Moon, Monitor };
  protected readonly year = new Date().getFullYear();
  protected readonly bars = [28, 42, 35, 58, 46, 64, 52, 71, 60, 84, 73, 92];
  protected readonly features = ['auth.features.sources', 'auth.features.charts', 'auth.features.library'];

  protected readonly themeIcon = computed(() =>
    this.theme.preference() === 'system' ? Monitor : this.theme.preference() === 'dark' ? Moon : Sun,
  );
  protected readonly themeLabel = computed(() => `theme.${this.theme.preference()}`);
}
