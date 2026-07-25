import type { ReactNode } from 'react'
import { portalCountdownInnerClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface CountdownTimeCardProps {
  children: ReactNode
  className?: string
  meta?: string
  ariaLabel?: string
}

/** Bordered, centered countdown card — admin election cards and standalone timers. */
export function CountdownTimeCard({
  children,
  className,
  meta,
  ariaLabel,
}: CountdownTimeCardProps) {
  return (
    <div
      className={cn(
        'portal-surface mt-3 overflow-hidden rounded-2xl',
        portalCountdownInnerClass,
        className,
      )}
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {meta ? (
        <div className="portal-surface__header px-4 py-3 text-center sm:px-6 sm:py-3.5">
          <p className="portal-subtle text-xs font-semibold sm:text-sm">{meta}</p>
        </div>
      ) : null}
      <div className="flex flex-col items-center justify-center px-4 py-5 text-center sm:px-6 sm:py-6">
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
        'flex flex-col items-center justify-center text-center',
        className,
      )}
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}
