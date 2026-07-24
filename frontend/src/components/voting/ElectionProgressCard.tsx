import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  memberCardHeaderTintClass,
  memberCardPaddingClass,
  memberCardSurfaceClass,
} from '@/lib/design-tokens'
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
  APPLICATIONS_OPEN: 'Applications Open',
  REVIEWING: 'Reviewing',
  READY_FOR_VOTING: 'Ready for Voting',
  VOTING_OPEN: 'Voting Open',
  VOTING_CLOSED: 'Voting Closed',
  RESULTS_PUBLISHED: 'Results Published',
  ARCHIVED: 'Archived',
}

const statusVariants: Record<ElectionPhase, 'success' | 'warning' | 'secondary' | 'outline'> = {
  DRAFT: 'outline',
  SCHEDULED: 'outline',
  APPLICATIONS_OPEN: 'warning',
  REVIEWING: 'warning',
  READY_FOR_VOTING: 'warning',
  VOTING_OPEN: 'success',
  VOTING_CLOSED: 'secondary',
  RESULTS_PUBLISHED: 'secondary',
  ARCHIVED: 'secondary',
}

export function ElectionProgressCard({
  electionName,
  status,
  votedCount,
  total,
  canVote,
}: ElectionProgressCardProps) {
  const progress = total > 0 ? (votedCount / total) * 100 : 0
  const isComplete = votedCount === total && total > 0

  return (
    <Card className={memberCardSurfaceClass}>
      <CardHeader className={cn(memberCardHeaderTintClass, memberCardPaddingClass, 'pb-4 sm:pb-5')}>
        <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{electionName}</CardTitle>
            <CardDescription className="max-w-xl text-pretty text-sm sm:text-base">
              {canVote
                ? 'Choose one candidate for each position below.'
                : status === 'VOTING_CLOSED' || status === 'RESULTS_PUBLISHED'
                  ? 'Voting has ended. Your selections are saved below.'
                  : 'Voting is not open yet.'}
            </CardDescription>
          </div>
          <Badge variant={statusVariants[status]} className="w-fit shrink-0 px-2.5 py-1">
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(memberCardPaddingClass, 'pt-0')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center sm:mx-0 sm:h-24 sm:w-24">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className="stroke-muted/50"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className={cn('stroke-primary transition-all duration-500', isComplete && 'stroke-success')}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress} 100`}
                pathLength={100}
              />
            </svg>
            <span className="absolute text-sm font-bold tabular-nums sm:text-base">
              {formatPercent(progress)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 font-medium">
                {votedCount} of {total} positions completed
              </span>
            </div>
            <Progress
              value={progress}
              aria-label={`Voting progress: ${votedCount} of ${total} positions`}
              className="h-2.5"
            />
            {isComplete ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                You have voted for all positions
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
