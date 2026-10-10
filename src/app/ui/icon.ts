import { ChangeDetectionStrategy, Component, ElementRef, Renderer2, effect, inject, input } from '@angular/core';
import type { IconNode } from 'lucide';

/**
 * Renders a lucide icon definition inside the host <svg>.
 * Usage: <svg appIcon [icon]="icons.Search" class="size-4"></svg>
 */
@Component({
  selector: 'svg[appIcon]',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    '[attr.stroke-width]': 'strokeWidth()',
    class: 'shrink-0',
  },
})
export class Icon {
  readonly icon = input.required<IconNode>();
  readonly strokeWidth = input(1.75);

  private readonly host = inject<ElementRef<SVGSVGElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  constructor() {
    effect(() => {
      const svg = this.host.nativeElement;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      for (const [tag, attrs] of this.icon()) {
        const child = this.renderer.createElement(tag, 'svg');
        for (const [name, value] of Object.entries(attrs)) {
          if (value !== undefined) this.renderer.setAttribute(child, name, String(value));
        }
        this.renderer.appendChild(svg, child);
      }
    });
  }
}
