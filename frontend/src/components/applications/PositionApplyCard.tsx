import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  memberCardRadiusClass,
  memberPositionCardClass,
  transitionInteractive,
} from '@/lib/design-tokens'
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
  const isLocked =
    buttonLabel === 'Opens soon' || buttonLabel === 'Already applied' || buttonLabel === 'Not eligible'
  const isActionable = !buttonDisabled && !showSubmittedState && Boolean(onApply)
  const showMessage = Boolean(bodyText)

  return (
    <Card
      className={cn(
        memberPositionCardClass,
        memberCardRadiusClass,
        transitionInteractive,
        isActionable && 'hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:ring-primary/20',
        showSubmittedState && 'border-success/35 ring-success/20',
        bodyTone === 'destructive' && !showSubmittedState && 'border-destructive/30',
        isLocked && !showSubmittedState && 'opacity-95',
      )}
    >
      <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
              {positionName}
            </h3>
            {academicYear ? (
              <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide sm:text-xs">
                {academicYear}
              </Badge>
            ) : null}
          </div>

          {showMessage ? (
            <div
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm leading-relaxed',
                bodyTone === 'destructive' && 'border-destructive/25 bg-destructive/5 text-destructive',
                bodyTone !== 'destructive' && 'border-border/60 bg-muted/25 text-muted-foreground',
              )}
            >
              {bodyText}
            </div>
          ) : null}
        </div>

        {showSubmittedState ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-success/25 bg-success/8 px-3 py-2.5 text-sm font-semibold text-success sm:mt-5">
            Application submitted
          </div>
        ) : (
          <div className={cn('mt-4 sm:mt-5', showMessage && 'sm:mt-6')}>
            <Button
              type="button"
              onClick={onApply}
              className="h-10 w-full sm:h-11"
              disabled={buttonDisabled}
              aria-busy={buttonBusy}
              variant={isActionable ? 'default' : 'secondary'}
            >
              {buttonLabel}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
