import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FadeIn } from '@/components/motion/FadeIn'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { CheckCircle2, Vote } from 'lucide-react'
import { fetchBallot, submitVote } from '@/api/votes'
import { getApiErrorMessage } from '@/api/client'
import { BallotProgressCard } from '@/components/voting/BallotProgressCard'
import { CandidateCard } from '@/components/voting/CandidateCard'
import { VoteConfirmDialog } from '@/components/voting/VoteConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { pageLayoutClass } from '@/lib/design-tokens'
import { handleRadioGroupKeyDown } from '@/lib/a11y'
import { cn } from '@/lib/utils'
import type { BallotItem, Candidate } from '@/types/api'
import { toast } from 'sonner'

interface PendingVote {
  positionId: number
  candidateId: number
  candidateName: string
  candidatePhoto: string
  positionName: string
}

export function BallotPage() {
  const queryClient = useQueryClient()
  const reduceMotion = usePrefersReducedMotion()
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ballot'],
    queryFn: fetchBallot,
    retry: false,
  })

  const voteMutation = useMutation({
    mutationFn: ({ positionId, candidateId }: { positionId: number; candidateId: number }) =>
      submitVote(positionId, candidateId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['ballot'] })
      toast.success(`Vote recorded for ${result.candidate_name}`)
      setPendingVote(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
      setPendingVote(null)
    },
  })

  if (isLoading) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <EmptyState
          icon={Vote}
          title="Voting unavailable"
          description={getApiErrorMessage(error, 'No active election at this time.')}
        />
      </div>
    )
  }

  if (!data) return null

  const votedCount = data.ballot.filter((b) => b.has_voted).length
  const total = data.ballot.length
  const isActive = data.election.status === 'ACTIVE'

  return (
    <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
      <PageHeader
        title="Ballot"
        description="Select one candidate per position"
        action={
          <Badge variant={isActive ? 'success' : 'secondary'}>{data.election.status}</Badge>
        }
      />

      <BallotProgressCard
        electionName={data.election.name}
        status={data.election.status}
        votedCount={votedCount}
        total={total}
        isActive={isActive}
      />

      {data.ballot.map((item, index) => (
        <PositionBallot
          key={item.position.id}
          item={item}
          index={index}
          reduceMotion={reduceMotion}
          onSelect={(candidate) =>
            setPendingVote({
              positionId: item.position.id,
              candidateId: candidate.id,
              candidateName: candidate.full_name,
              candidatePhoto: candidate.photo_url,
              positionName: item.position.name,
            })
          }
        />
      ))}

      {pendingVote && (
        <VoteConfirmDialog
          open
          candidateName={pendingVote.candidateName}
          candidatePhoto={pendingVote.candidatePhoto}
          positionName={pendingVote.positionName}
          loading={voteMutation.isPending}
          onCancel={() => setPendingVote(null)}
          onConfirm={() =>
            voteMutation.mutate({
              positionId: pendingVote.positionId,
              candidateId: pendingVote.candidateId,
            })
          }
        />
      )}
    </div>
  )
}

function PositionBallot({
  item,
  index,
  reduceMotion,
  onSelect,
}: {
  item: BallotItem
  index: number
  reduceMotion: boolean
  onSelect: (candidate: Candidate) => void
}) {
  const sectionId = `position-${item.position.id}-label`

  const content = (
    <Card className={cn(item.has_voted && 'border-success/30 bg-success/5')}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id={sectionId} className="text-lg font-semibold leading-none tracking-tight">
              {item.position.name}
            </h2>
            <CardDescription>One vote · irreversible</CardDescription>
          </div>
          {item.has_voted && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Voted
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {item.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates for this position.</p>
        ) : (
          <div
            role="radiogroup"
            aria-labelledby={sectionId}
            aria-readonly={item.has_voted || undefined}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onKeyDown={handleRadioGroupKeyDown}
          >
            {item.candidates.map((candidate) => {
              const isRecorded = item.has_voted && item.my_candidate_id === candidate.id

              return (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isRecorded={isRecorded}
                  disabled={item.has_voted}
                  onSelect={() => onSelect(candidate)}
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (reduceMotion) {
    return content
  }

  return (
    <FadeIn delay={index * 0.05}>
      {content}
    </FadeIn>
  )
}
