import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Tiny trend line for stat tiles (de-emphasised ink, current period marked). */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative' },
  template: `
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" class="block h-7 w-full overflow-visible" aria-hidden="true">
      <path [attr.d]="area()" fill="currentColor" opacity="0.07" />
      <path
        [attr.d]="line()"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        opacity="0.5"
      />
    </svg>
    @if (last(); as point) {
      <!-- HTML dot so it stays round while the SVG stretches -->
      <span
        class="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
        [style.left.%]="point.x"
        [style.top.%]="(point.y / 28) * 100"
      ></span>
    }
  `,
})
export class Sparkline {
  readonly values = input.required<number[]>();

  private readonly points = computed(() => {
    const values = this.values();
    if (values.length < 2) return [];
    const max = Math.max(...values, 1);
    const step = 100 / (values.length - 1);
    return values.map((value, index) => ({ x: index * step, y: 26 - (value / max) * 24 }));
  });

  protected readonly line = computed(() =>
    this.points()
      .map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(' '),
  );
  protected readonly area = computed(() => (this.points().length ? `${this.line()} L100,28 L0,28 Z` : ''));
  protected readonly last = computed(() => this.points().at(-1) ?? null);
}
