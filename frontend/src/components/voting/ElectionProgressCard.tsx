import { CheckCircle2, PauseCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { ElectionPhase } from '@/types/api'
import { formatPercent } from '@/lib/utils'

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

  return (
    <Card className="overflow-hidden border-primary/20 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-br from-primary/5 via-transparent to-transparent pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">{electionName}</CardTitle>
            <CardDescription>
              {canVote
                ? 'Choose one candidate for each position below.'
                : status === 'VOTING_CLOSED' || status === 'RESULTS_PUBLISHED'
                  ? 'Voting has ended. Your selections are saved below.'
                  : 'Voting is not open yet.'}
            </CardDescription>
          </div>
          <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">
            {votedCount} of {total} positions completed
          </span>
          <span className="font-semibold tabular-nums text-primary">{formatPercent(progress)}</span>
        </div>
        <Progress
          value={progress}
          aria-label={`Voting progress: ${votedCount} of ${total} positions`}
          className="h-2.5"
        />
        {votedCount === total && total > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            You have voted for all positions
          </p>
        )}

      </CardContent>
    </Card>
  )
}
