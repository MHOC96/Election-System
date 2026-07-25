import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { PortalCard, PortalIconTile } from '@/components/member/PortalCard'
import { CountdownDisplay } from '@/components/shared/CountdownDisplay'
import { portalCountdownInnerClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface PortalPhaseHeroProps {
  icon: LucideIcon
  /** Small uppercase kicker above the title. */
  eyebrow?: string
  title: string
  subtitle?: string
  /** Short highlighted line, typically the date the phase opens or closes. */
  meta?: string
  /** Longer explanatory paragraph shown under the title block. */
  blurb?: string
  countdownTargetAt?: string | null
  countdownLabel?: string
  /** Schedule details or actions rendered below a divider. */
  footer?: ReactNode
  className?: string
}

/**
 * Centred hero used at the top of every waiting-state phase page: icon, title,
 * countdown, and an optional schedule footer. Colour is inherited from the
 * surrounding accent scope, so the same markup serves each election stage.
 */
export function PortalPhaseHero({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  meta,
  blurb,
  countdownTargetAt,
  countdownLabel,
  footer,
  className,
}: PortalPhaseHeroProps) {
  return (
    <PortalCard raised className={cn('mx-auto w-full', className)} aria-live="polite">
      <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <div
          className={cn(
            portalCountdownInnerClass,
            'flex flex-col items-center gap-5 text-center sm:gap-6',
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <PortalIconTile size="lg">
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </PortalIconTile>

            {eyebrow ? (
              <p className="portal-subtle text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs">
                {eyebrow}
              </p>
            ) : null}

            <h2 className="portal-heading text-balance text-xl font-bold tracking-tight sm:text-2xl">
              {title}
            </h2>

            {subtitle ? (
              <p className="portal-subtle text-sm leading-relaxed sm:text-base">{subtitle}</p>
            ) : null}

            {meta ? <p className="portal-accent-text text-sm font-semibold">{meta}</p> : null}
          </div>

          {blurb ? (
            <p className="portal-body max-w-md text-pretty text-sm leading-relaxed">{blurb}</p>
          ) : null}

          {countdownTargetAt && countdownLabel ? (
            <CountdownDisplay
              targetAt={countdownTargetAt}
              label={countdownLabel}
              centered
              className="pt-1"
            />
          ) : null}

          {footer ? (
            <div className="portal-divider w-full border-t pt-5 sm:pt-6">{footer}</div>
          ) : null}
        </div>
      </div>
    </PortalCard>
  )
}
