import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { formatDate } from '../core/format';
import { I18nService, TranslatePipe } from '../core/i18n/i18n.service';
import type { PeriodPoint } from '../core/models';

interface Cell {
  date: string;
  count: number;
  level: number;
  label: string;
}

/** GitHub-style activity calendar: one column per week (Mon-Sun), one-hue sequential ramp. */
@Component({
  selector: 'app-heatmap',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto pb-1">
      <div class="inline-flex flex-col gap-1.5">
        <div class="ml-7 flex gap-[3px] text-[10px] text-muted-foreground">
          @for (week of weeks(); track $index) {
            <span class="w-3 overflow-visible whitespace-nowrap">{{ week.month }}</span>
          }
        </div>
        <div class="flex gap-1.5">
          <div class="grid w-5.5 grid-rows-7 gap-[3px] text-[10px] leading-3 text-muted-foreground">
            @for (day of weekdayLabels(); track $index) {
              <span class="h-3">{{ day }}</span>
            }
          </div>
          <div class="flex gap-[3px]" role="grid" [attr.aria-label]="'dashboard.heatmap.title' | t">
            @for (week of weeks(); track $index) {
              <div class="grid grid-rows-7 gap-[3px]">
                @for (cell of week.cells; track $index) {
                  @if (cell) {
                    <span
                      role="gridcell"
                      class="size-3 rounded-[3px] transition-transform hover:scale-125"
                      [style.background]="'var(--heat-' + cell.level + ')'"
                      [title]="cell.label"
                      [attr.aria-label]="cell.label"
                    ></span>
                  } @else {
                    <span class="size-3"></span>
                  }
                }
              </div>
            }
          </div>
        </div>
        <div class="ml-7 mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{{ 'dashboard.heatmap.less' | t }}</span>
          @for (level of [0, 1, 2, 3, 4]; track level) {
            <span class="size-2.5 rounded-[3px]" [style.background]="'var(--heat-' + level + ')'"></span>
          }
          <span>{{ 'dashboard.heatmap.more' | t }}</span>
        </div>
      </div>
    </div>
  `,
})
export class Heatmap {
  readonly days = input.required<PeriodPoint[]>();
  private readonly i18n = inject(I18nService);

  protected readonly weekdayLabels = computed(() => {
    const lang = this.i18n.lang();
    const formatter = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'narrow' });
    // 2024-01-01 was a Monday; show Mon / Wed / Fri only to keep it light.
    return Array.from({ length: 7 }, (_, index) =>
      index % 2 === 0 ? formatter.format(new Date(2024, 0, 1 + index)) : '',
    );
  });

  protected readonly weeks = computed(() => {
    const lang = this.i18n.lang();
    const days = this.days();
    const max = Math.max(1, ...days.map((day) => day.searches));
    const monthFormatter = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short' });

    const cells: (Cell | null)[] = days.map((day) => {
      const level = day.searches === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((day.searches / max) * 4)));
      const [year, month, date] = day.period.split('-').map(Number);
      return {
        date: day.period,
        count: day.searches,
        level,
        label: `${this.i18n.t('dashboard.heatmap.cell', { n: day.searches })} · ${formatDate(new Date(year, month - 1, date), lang)}`,
      };
    });

    // Pad the first week so columns start on Monday.
    const first = days[0] ? new Date(`${days[0].period}T00:00:00`) : new Date();
    const offset = (first.getDay() + 6) % 7;
    const padded = [...Array<null>(offset).fill(null), ...cells];

    const weeks: { cells: (Cell | null)[]; month: string }[] = [];
    let lastMonth = -1;
    for (let index = 0; index < padded.length; index += 7) {
      const week = padded.slice(index, index + 7);
      const firstReal = week.find((cell): cell is Cell => cell !== null);
      let month = '';
      if (firstReal) {
        const date = new Date(`${firstReal.date}T00:00:00`);
        if (date.getMonth() !== lastMonth) {
          month = weeks.length === 0 && date.getDate() > 20 ? '' : monthFormatter.format(date);
          lastMonth = date.getMonth();
        }
      }
      weeks.push({ cells: [...week, ...Array<null>(7 - week.length).fill(null)], month });
    }
    return weeks;
  });
}
