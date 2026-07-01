import { CheckCircle2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatPercent } from '@/lib/utils'

interface BallotProgressCardProps {
  electionName: string
  status: string
  votedCount: number
  total: number
  isActive?: boolean
}

export function BallotProgressCard({
  electionName,
  status,
  votedCount,
  total,
  isActive,
}: BallotProgressCardProps) {
  const progress = total > 0 ? (votedCount / total) * 100 : 0

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {isActive && (
                <Lock className="h-4 w-4 text-success" aria-hidden="true" />
              )}
              <CardTitle>{electionName}</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Your vote is encrypted and recorded once per position
            </CardDescription>
          </div>
          <Badge variant={status === 'ACTIVE' ? 'success' : 'secondary'}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary text-xs font-semibold tabular-nums text-primary"
              aria-hidden="true"
            >
              {votedCount}/{total}
            </span>
            <span>
              {votedCount} of {total} positions voted
            </span>
          </span>
          <span className="font-medium tabular-nums">{formatPercent(progress)}</span>
        </div>
        <Progress value={progress} aria-label={`Ballot progress: ${votedCount} of ${total} positions`} />
        {votedCount === total && total > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Ballot complete
          </p>
        )}
      </CardContent>
    </Card>
  )
}
