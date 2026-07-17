import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApplicationRejectionNoticeProps {
  reason?: string
  className?: string
  compact?: boolean
}

export function ApplicationRejectionNotice({
  reason,
  className,
  compact = false,
}: ApplicationRejectionNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-destructive/20 bg-destructive/[0.04] text-left dark:border-destructive/30 dark:bg-destructive/[0.08]',
        compact ? 'px-3.5 py-3.5 sm:px-4 sm:py-4' : 'px-4 py-4 sm:px-5 sm:py-5',
        className,
      )}
      role="status"
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive',
            compact ? 'mt-0.5 h-8 w-8' : 'mt-0.5 h-9 w-9',
          )}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-2">
          <div>
            <p className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
              Application not approved
            </p>
            <p
              className={cn(
                'mt-1 leading-relaxed text-muted-foreground',
                compact ? 'text-sm' : 'text-sm sm:text-base',
              )}
            >
              Your application was reviewed, but it was not accepted for this position.
            </p>
          </div>

          {reason ? (
            <div className="rounded-lg border border-border/60 bg-card/80 px-3 py-3 dark:bg-card/60 sm:px-4 sm:py-3.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Reason from the committee
              </p>
              <p
                className={cn(
                  'mt-1.5 leading-relaxed text-foreground',
                  compact ? 'text-sm' : 'text-sm sm:text-base',
                )}
              >
                {reason}
              </p>
            </div>
          ) : null}

          <p className={cn('text-muted-foreground', compact ? 'text-xs sm:text-sm' : 'text-sm')}>
            If you have questions, please contact the election committee.
          </p>
        </div>
      </div>
    </div>
  )
}
