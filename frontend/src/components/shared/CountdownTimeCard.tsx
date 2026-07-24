import type { ReactNode } from 'react'
import { portalCountdownInnerClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface CountdownTimeCardProps {
  children: ReactNode
  modifier?: string
  className?: string
  meta?: string
  ariaLabel?: string
}

/** Bordered, centered countdown card — admin election cards and standalone timers. */
export function CountdownTimeCard({
  children,
  modifier,
  className,
  meta,
  ariaLabel,
}: CountdownTimeCardProps) {
  return (
    <div
      className={cn(
        'election-countdown mx-auto mt-3 w-full min-w-0 overflow-hidden rounded-xl',
        portalCountdownInnerClass,
        modifier,
        className,
      )}
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {meta ? (
        <div className="border-b border-border/50 bg-[var(--cd-date-bg,hsl(var(--card)/0.4))] px-4 py-3 text-center sm:px-6 sm:py-3.5">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{meta}</p>
        </div>
      ) : null}
      <div className="flex flex-col items-center justify-center px-4 py-5 pb-6 text-center sm:px-6 sm:py-6 sm:pb-8">
        {children}
      </div>
    </div>
  )
}

interface CountdownTimeInlineProps {
  children: ReactNode
  className?: string
  ariaLabel?: string
}

/** Centered countdown block inside an existing parent card (no extra border). */
export function CountdownTimeInline({ children, className, ariaLabel }: CountdownTimeInlineProps) {
  return (
    <div
      className={cn(
        portalCountdownInnerClass,
        'flex flex-col items-center justify-center px-1 py-2 text-center sm:px-4 sm:py-4',
        className,
      )}
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}
