import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Brand mark: three connected nodes forming an "A" (knowledge graph). Adapts to the theme. */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0' },
  template: `
    <svg viewBox="0 0 32 32" class="size-full" aria-hidden="true">
      <rect width="32" height="32" rx="8" class="fill-foreground" />
      <g class="stroke-background" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 22 L16 10 L22 22" />
        <path d="M12.5 17h7" />
      </g>
      <g class="fill-background">
        <circle cx="16" cy="10" r="2.4" />
        <circle cx="10" cy="22" r="2.4" />
        <circle cx="22" cy="22" r="2.4" />
      </g>
    </svg>
  `,
})
export class Logo {}
