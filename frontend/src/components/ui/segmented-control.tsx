import { cn } from '@/lib/utils'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentedControlOption<T>[]
  className?: string
  'aria-label': string
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full max-w-full rounded-xl bg-muted/80 p-1 ring-1 ring-inset ring-border/60 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.55)] sm:w-auto',
        'dark:bg-muted/25 dark:ring-border/70 dark:shadow-none',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative min-h-9 flex-1 rounded-[0.65rem] px-3 py-1.5 text-xs font-semibold tracking-tight transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:min-w-[6.5rem] sm:flex-none sm:px-4 sm:text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive
                ? 'bg-card text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.85),0_2px_10px_hsl(var(--primary)/0.12)] ring-1 ring-primary/20 dark:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08),0_4px_16px_hsl(var(--primary)/0.14)] dark:ring-primary/25'
                : 'text-muted-foreground hover:bg-white/60 hover:text-foreground active:scale-[0.98] dark:hover:bg-foreground/[0.03]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
