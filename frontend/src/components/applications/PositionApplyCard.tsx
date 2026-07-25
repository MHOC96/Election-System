import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PortalCard, PortalChip } from '@/components/member/PortalCard'
import { accentScope } from '@/lib/portal-accent'
import { cn } from '@/lib/utils'

interface PositionApplyCardProps {
  positionName: string
  academicYear?: string | null
  bodyText?: string
  bodyTone?: 'default' | 'destructive'
  buttonLabel: string
  buttonDisabled?: boolean
  buttonBusy?: boolean
  onApply?: () => void
  showSubmittedState?: boolean
}

export function PositionApplyCard({
  positionName,
  academicYear,
  bodyText,
  bodyTone = 'default',
  buttonLabel,
  buttonDisabled = false,
  buttonBusy = false,
  onApply,
  showSubmittedState = false,
}: PositionApplyCardProps) {
  const isActionable = !buttonDisabled && !showSubmittedState && Boolean(onApply)
  const showMessage = Boolean(bodyText)

  return (
    <PortalCard
      as="article"
      selected={showSubmittedState}
      className={cn(
        'flex h-full flex-col',
        // A submitted application reads green; a blocking message reads amber.
        showSubmittedState && accentScope('success'),
        bodyTone === 'destructive' && !showSubmittedState && accentScope('warning'),
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5 lg:p-6">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="portal-heading min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight sm:text-lg">
              {positionName}
            </h3>
            {academicYear ? (
              <span className="portal-subtle shrink-0 rounded-full bg-portal-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
                {academicYear}
              </span>
            ) : null}
          </div>

          {showMessage ? (
            <p
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm leading-relaxed',
                bodyTone === 'destructive'
                  ? 'portal-accent-soft portal-accent-border portal-accent-text'
                  : 'portal-subtle border-portal-border bg-portal-muted',
              )}
            >
              {bodyText}
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-4 sm:pt-5">
          {showSubmittedState ? (
            <PortalChip className="w-full justify-center gap-2 rounded-xl py-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Application submitted
            </PortalChip>
          ) : (
            <Button
              type="button"
              onClick={onApply}
              className="h-11 w-full"
              disabled={buttonDisabled}
              aria-busy={buttonBusy}
              variant={isActionable ? 'default' : 'secondary'}
            >
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>
    </PortalCard>
  )
}
