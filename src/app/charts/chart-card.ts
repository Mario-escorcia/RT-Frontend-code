import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ChartColumn, Table2 } from 'lucide';
import { I18nService, TranslatePipe } from '../core/i18n/i18n.service';
import { Icon } from '../ui/icon';
import { ChartView, foldSlices, formatChartValue, type ChartInput } from './chart';

/** Card with a chart and an accessible table view of the same data. */
@Component({
  selector: 'app-chart-card',
  imports: [ChartView, Icon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="surface-card flex h-full flex-col p-5">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          @if (eyebrow()) {
            <p class="eyebrow mb-1.5">{{ eyebrow() }}</p>
          }
          <h3 class="text-sm font-semibold tracking-tight text-balance">{{ heading() }}</h3>
          @if (subtitle()) {
            <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ subtitle() }}</p>
          }
        </div>
        <div class="flex shrink-0 items-center gap-1 no-print">
          <ng-content select="[cardActions]" />
          <button
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            [attr.aria-pressed]="showTable()"
            [attr.aria-label]="(showTable() ? 'chart.showChart' : 'chart.showTable') | t"
            [title]="(showTable() ? 'chart.showChart' : 'chart.showTable') | t"
            (click)="showTable.update((value) => !value)"
          >
            <svg appIcon [icon]="showTable() ? icons.ChartColumn : icons.Table2" class="size-4"></svg>
          </button>
        </div>
      </header>

      <ng-content select="[cardToolbar]" />

      <div class="mt-4 flex-1">
        @if (showTable()) {
          <div class="overflow-auto rounded-lg border border-border" [style.max-height.px]="height()">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ 'chart.label' | t }}</th>
                  @for (serie of tableData().series; track $index) {
                    <th class="px-3 py-2 text-right font-medium">{{ serie.name }}</th>
                  }
                </tr>
              </thead>
              <tbody class="tabular">
                @for (label of tableData().labels; track $index; let row = $index) {
                  <tr class="border-t border-border">
                    <td class="px-3 py-1.5">{{ label }}</td>
                    @for (serie of tableData().series; track $index) {
                      <td class="px-3 py-1.5 text-right">{{ format(serie.data[row]) }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-chart [data]="data()" [height]="height()" [ariaLabel]="heading()" />
        }
      </div>

      <ng-content />
    </section>
  `,
})
export class ChartCard {
  readonly heading = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly eyebrow = input<string | null>(null);
  readonly data = input.required<ChartInput>();
  readonly height = input(240);

  private readonly i18n = inject(I18nService);
  protected readonly showTable = signal(false);
  protected readonly icons = { ChartColumn, Table2 };
  protected readonly tableData = computed(() => {
    const data = this.data();
    return data.type === 'pie' || data.type === 'doughnut' ? foldSlices(data, this.i18n.t('common.other')) : data;
  });

  protected format(value: number | null | undefined) {
    return formatChartValue(value ?? null, this.data(), this.i18n.lang());
  }
}
