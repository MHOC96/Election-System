import { CheckCircle2 } from 'lucide-react'
import {
  PortalCard,
  PortalCardContent,
  PortalCardDescription,
  PortalCardHeader,
  PortalCardTitle,
  PortalChip,
} from '@/components/member/PortalCard'
import { accentScope } from '@/lib/portal-accent'
import type { ElectionPhase } from '@/types/api'
import { cn, formatPercent } from '@/lib/utils'

interface ElectionProgressCardProps {
  electionName: string
  status: ElectionPhase
  votedCount: number
  total: number
  canVote: boolean
}

const statusLabels: Record<ElectionPhase, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  APPLICATIONS_OPEN: 'Applications open',
  REVIEWING: 'Reviewing',
  READY_FOR_VOTING: 'Ready for voting',
  VOTING_OPEN: 'Voting open',
  VOTING_CLOSED: 'Voting closed',
  RESULTS_PUBLISHED: 'Results published',
  ARCHIVED: 'Archived',
}

function helperText(status: ElectionPhase, canVote: boolean): string {
  if (canVote) return 'Choose one candidate for each position below.'
  if (status === 'VOTING_CLOSED' || status === 'RESULTS_PUBLISHED') {
    return 'Voting has ended. Your selections are saved below.'
  }
  return 'Voting is not open yet.'
}

export function ElectionProgressCard({
  electionName,
  status,
  votedCount,
  total,
  canVote,
}: ElectionProgressCardProps) {
  const progress = total > 0 ? (votedCount / total) * 100 : 0
  const isComplete = total > 0 && votedCount === total

  return (
    <PortalCard>
      <PortalCardHeader>
        <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0">
            <PortalCardTitle className="sm:text-2xl">{electionName}</PortalCardTitle>
            <PortalCardDescription className="max-w-xl">
              {helperText(status, canVote)}
            </PortalCardDescription>
          </div>
          <PortalChip className="px-3 py-1.5">{statusLabels[status]}</PortalChip>
        </div>
      </PortalCardHeader>

      <PortalCardContent
        // Completing the ballot flips this block to green regardless of phase.
        className={cn(isComplete && accentScope('success'))}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
          <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center sm:mx-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className="stroke-portal-border"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className="stroke-portal-accent transition-all duration-500 ease-out-expo"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress} 100`}
                pathLength={100}
              />
            </svg>
            <span className="portal-heading absolute text-base font-bold tabular-nums">
              {formatPercent(progress)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="portal-body text-sm font-semibold">
              {votedCount} of {total} positions completed
            </p>

            <div
              className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-portal-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={votedCount}
              aria-label={`Voting progress: ${votedCount} of ${total} positions`}
            >
              <div
                className="portal-accent-fill h-full rounded-full transition-[width] duration-500 ease-out-expo"
                style={{ width: `${progress}%` }}
              />
            </div>

            {isComplete ? (
              <p className="portal-accent-text mt-3 flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                You have voted for all positions
              </p>
            ) : null}
          </div>
        </div>
      </PortalCardContent>
    </PortalCard>
  )
}
