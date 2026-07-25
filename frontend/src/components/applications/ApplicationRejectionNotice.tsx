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
        'rounded-xl border border-destructive/25 bg-destructive/[0.06] text-left dark:bg-destructive/[0.1]',
        compact ? 'px-3.5 py-3.5 sm:px-4 sm:py-4' : 'px-4 py-4 sm:px-5 sm:py-5',
        className,
      )}
      role="status"
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive',
            compact ? 'h-8 w-8' : 'h-9 w-9',
          )}
          aria-hidden="true"
        >
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-2.5">
          <div>
            <p className={cn('portal-heading font-semibold', compact ? 'text-sm' : 'text-base')}>
              Application not approved
            </p>
            <p
              className={cn(
                'portal-subtle mt-1 leading-relaxed',
                compact ? 'text-sm' : 'text-sm sm:text-base',
              )}
            >
              Your application was reviewed, but it was not accepted for this position.
            </p>
          </div>

          {reason ? (
            <div className="rounded-lg border border-portal-border bg-portal-surface px-3 py-3 sm:px-4 sm:py-3.5">
              <p className="portal-subtle text-xs font-semibold uppercase tracking-wide">
                Reason from the committee
              </p>
              <p
                className={cn(
                  'portal-body mt-1.5 leading-relaxed',
                  compact ? 'text-sm' : 'text-sm sm:text-base',
                )}
              >
                {reason}
              </p>
            </div>
          ) : null}

          <p className={cn('portal-subtle', compact ? 'text-xs sm:text-sm' : 'text-sm')}>
            If you have questions, please contact the election committee.
          </p>
        </div>
      </div>
    </div>
  )
}
