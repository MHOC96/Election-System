import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, CheckCircle2, Vote } from 'lucide-react'
import { fetchBallot, submitVote } from '@/api/votes'
import { getApiErrorMessage } from '@/api/client'
import { ElectionProgressCard } from '@/components/voting/ElectionProgressCard'
import { CandidateCard } from '@/components/voting/CandidateCard'
import { MemberSelectionItem } from '@/components/voting/MemberSelectionItem'
import { VoteConfirmDialog } from '@/components/voting/VoteConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'
import { pageLayoutClass } from '@/lib/design-tokens'
import { BALLOT_QUERY_KEY, BALLOT_STALE_MS } from '@/lib/query-sync'
import { handleRadioGroupKeyDown } from '@/lib/a11y'
import { cn } from '@/lib/utils'
import type { BallotItem, Candidate } from '@/types/api'
import { notifyError } from '@/lib/notify'

interface PendingVote {
  positionId: number
  candidateId: number
  candidateName: string
  candidatePhoto: string
  positionName: string
}

export function BallotPage() {
  const queryClient = useQueryClient()
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null)

  const ballotQuery = useQuery({
    queryKey: BALLOT_QUERY_KEY,
    queryFn: fetchBallot,
    staleTime: BALLOT_STALE_MS,
    placeholderData: (previous) => previous,
    retry: false,
  })

  const voteMutation = useMutation({
    mutationFn: ({ positionId, candidateId }: { positionId: number; candidateId: number }) =>
      submitVote(positionId, candidateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BALLOT_QUERY_KEY })
      setPendingVote(null)
    },
    onError: (err) => {
      notifyError(getApiErrorMessage(err))
      setPendingVote(null)
    },
  })

  if (ballotQuery.isPending && !ballotQuery.data) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const ballot = ballotQuery.data
  const voteStatus = ballot?.vote_status
  const electionEnded = ballot?.election_ended || voteStatus?.election_ended

  if (electionEnded) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <PageHeader title="Executive Election" description="Member voting portal" />
        <EmptyState
          icon={CalendarCheck}
          title="This election has ended"
          description="Election details and your selections are no longer shown after an election closes."
        />
      </div>
    )
  }

  if (!ballot?.election) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <PageHeader title="Executive Election" description="Member voting portal" />
        <EmptyState
          icon={Vote}
          title="No election in progress"
          description="When an election starts, you will be able to view details and cast your votes here."
        />
      </div>
    )
  }

  const positions = ballot.positions.filter((item) => item.candidates.length > 0)
  const votedCount = voteStatus?.positions_voted ?? positions.filter((p) => p.has_voted).length
  const total = voteStatus?.positions_total ?? positions.length
  const canVote = ballot.can_vote
  const selections = voteStatus?.votes ?? []

  if (positions.length === 0) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <PageHeader title="Executive Election" description="Member voting portal" />
        <EmptyState
          icon={Vote}
          title="No candidates yet"
          description="Positions will appear here once candidates are registered for the election."
        />
      </div>
    )
  }

  return (
    <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl space-y-8')}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Executive Election"
          description="View election details and submit your votes"
        />
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        <ElectionProgressCard
          electionName={ballot.election.name}
          status={ballot.election.current_phase}
          votedCount={votedCount}
          total={total}
          canVote={canVote}
        />
      </Stagger>

      {selections.length > 0 && (
        <Stagger delayMs={sectionDelays.secondary}>
          <section aria-labelledby="my-selections-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="my-selections-heading" className="text-lg font-semibold">
                Your selections
              </h2>
              <p className="text-sm text-muted-foreground">
                Only you can see who you voted for
              </p>
            </div>
            <Badge variant={voteStatus?.all_positions_voted ? 'success' : 'secondary'}>
              {votedCount}/{total}
            </Badge>
          </div>
          <StaggerChildren className="grid gap-3 sm:grid-cols-2" staggerMs={60}>
            {selections.map((vote) => (
              <MemberSelectionItem
                key={vote.position_id}
                positionName={vote.position_name}
                candidateName={vote.candidate_name}
                votedAt={vote.voted_at}
              />
            ))}
          </StaggerChildren>
          </section>
        </Stagger>
      )}

      <Stagger delayMs={selections.length > 0 ? sectionDelays.tertiary : sectionDelays.secondary}>
        <section aria-labelledby="vote-positions-heading" className="space-y-4">
        <div>
          <h2 id="vote-positions-heading" className="text-lg font-semibold">
            {canVote ? 'Cast your votes' : 'Election positions'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {canVote
              ? 'Select one candidate for each position. Each choice is final once submitted.'
              : 'Voting is not open. You can review candidates and your recorded selections.'}
          </p>
        </div>

        <StaggerChildren className="space-y-4" staggerMs={80} initialDelayMs={40}>
          {positions.map((item, index) => (
            <PositionSection
              key={item.position.id}
              item={item}
              index={index}
              canVote={canVote}
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
        </StaggerChildren>
        </section>
      </Stagger>

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

function PositionSection({
  item,
  index,
  canVote,
  onSelect,
}: {
  item: BallotItem
  index: number
  canVote: boolean
  onSelect: (candidate: Candidate) => void
}) {
  const sectionId = `position-${item.position.id}-label`
  const votingDisabled = !canVote || item.has_voted

  return (
    <Card
      className={cn(
        'overflow-hidden shadow-sm',
        item.has_voted && 'border-success/30 bg-success/[0.03]',
      )}
    >
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id={sectionId} className="text-lg font-semibold leading-none tracking-tight">
              {item.position.name}
            </h3>
            <CardDescription className="mt-1.5">
              {item.has_voted
                ? 'Your vote for this position is recorded'
                : canVote
                  ? 'Choose one candidate'
                  : 'Waiting for voting to resume'}
            </CardDescription>
          </div>
          {item.has_voted && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Voted
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div
          role="radiogroup"
          aria-labelledby={sectionId}
          aria-readonly={votingDisabled || undefined}
          className="grid gap-3 sm:grid-cols-2"
          onKeyDown={handleRadioGroupKeyDown}
        >
          {item.candidates.map((candidate, candidateIndex) => {
            const isRecorded = item.has_voted && item.my_candidate_id === candidate.id

            return (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                isRecorded={isRecorded}
                disabled={votingDisabled}
                priority={index === 0 && candidateIndex === 0}
                onSelect={() => onSelect(candidate)}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
