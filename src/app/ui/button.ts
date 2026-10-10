import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium select-none ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const VARIANTS: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
  outline: 'border border-border bg-card text-foreground shadow-xs hover:bg-accent',
  ghost: 'text-foreground hover:bg-accent',
  destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90',
  link: 'text-foreground underline-offset-4 hover:underline px-0',
};

const SIZES: Record<ButtonSize, string> = {
  default: 'h-9 px-4',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-11 px-6 text-[0.9375rem]',
  icon: 'size-9',
  'icon-sm': 'size-8 rounded-md',
};

/** shadcn-style button: <button uiBtn variant="outline" size="sm">…</button> */
@Directive({
  selector: 'button[uiBtn], a[uiBtn]',
  host: { '[class]': 'classes()' },
})
export class UiButton {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');
  protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.variant()]} ${SIZES[this.size()]}`);
}

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground border-transparent',
  secondary: 'bg-secondary text-secondary-foreground border-transparent',
  outline: 'text-foreground border-border',
  success: 'border-transparent bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success',
  warning: 'border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400',
  destructive: 'border-transparent bg-destructive/12 text-destructive',
};

/** shadcn-style badge: <span uiBadge variant="outline">…</span> */
@Directive({
  selector: '[uiBadge]',
  host: { '[class]': 'classes()' },
})
export class UiBadge {
  readonly variant = input<BadgeVariant>('secondary');
  protected readonly classes = computed(
    () =>
      `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE_VARIANTS[this.variant()]}`,
  );
}
