import { Children, isValidElement, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { cn } from '@/lib/utils'

const STAGGER_ANIMATION = 'animate-fade-in-up'

interface StaggerProps {
  /** Delay before this block animates in (ms). */
  delayMs?: number
  className?: string
  children: ReactNode
}

/** Animate a single page section with an optional delay. Respects reduced motion. */
export function Stagger({ delayMs = 0, className, children }: StaggerProps) {
  const reduceMotion = usePrefersReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      className={cn(STAGGER_ANIMATION, className)}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  )
}

interface StaggerChildrenProps {
  /** Delay added per child index (ms). */
  staggerMs?: number
  /** Base delay before the first child (ms). */
  initialDelayMs?: number
  className?: string
  children: ReactNode
}

/** Stagger animation across direct children (grids, lists). */
export function StaggerChildren({
  staggerMs = 70,
  initialDelayMs = 0,
  className,
  children,
}: StaggerChildrenProps) {
  const reduceMotion = usePrefersReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={className}>
      {Children.map(children, (child, index) => {
        if (child == null || child === false) return null
        if (!isValidElement(child)) {
          return (
            <div
              key={index}
              className={STAGGER_ANIMATION}
              style={{ animationDelay: `${initialDelayMs + index * staggerMs}ms` }}
            >
              {child}
            </div>
          )
        }

        return (
          <div
            key={child.key ?? index}
            className={STAGGER_ANIMATION}
            style={{ animationDelay: `${initialDelayMs + index * staggerMs}ms` }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

/** Standard section delays for admin pages (header → content → table). */
export const sectionDelays = {
  header: 0,
  primary: 80,
  secondary: 160,
  tertiary: 240,
  quaternary: 320,
} as const
