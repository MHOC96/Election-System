import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, Vote } from 'lucide-react'
import { fetchBallot, submitVote } from '@/api/votes'
import { getApiErrorMessage } from '@/api/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatPercent } from '@/lib/utils'
import type { BallotItem } from '@/types/api'
import { toast } from 'sonner'

export function BallotPage() {
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<{ positionId: number; candidateId: number; name: string; position: string } | null>(null)

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
      toast.success(`Vote cast for ${result.candidate_name}`)
      setConfirm(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
      setConfirm(null)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={Vote}
        title="Voting unavailable"
        description={getApiErrorMessage(error, 'No active election at this time.')}
      />
    )
  }

  if (!data) return null

  const votedCount = data.ballot.filter((b) => b.has_voted).length
  const total = data.ballot.length
  const progress = total > 0 ? (votedCount / total) * 100 : 0

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{data.election.name}</CardTitle>
                <CardDescription>Cast one vote per position. Votes are irreversible.</CardDescription>
              </div>
              <Badge variant="success">{data.election.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex justify-between text-sm">
              <span>
                {votedCount} of {total} positions voted
              </span>
              <span>{formatPercent(progress)}</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      </motion.div>

      {data.ballot.map((item, index) => (
        <PositionBallot
          key={item.position.id}
          item={item}
          index={index}
          onSelect={(candidateId, name) =>
            setConfirm({
              positionId: item.position.id,
              candidateId,
              name,
              position: item.position.name,
            })
          }
        />
      ))}

      <AlertDialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your vote</AlertDialogTitle>
            <AlertDialogDescription>
              You are voting for <strong>{confirm?.name}</strong> as{' '}
              <strong>{confirm?.position}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirm &&
                voteMutation.mutate({
                  positionId: confirm.positionId,
                  candidateId: confirm.candidateId,
                })
              }
              disabled={voteMutation.isPending}
            >
              {voteMutation.isPending ? 'Submitting...' : 'Submit Vote'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PositionBallot({
  item,
  index,
  onSelect,
}: {
  item: BallotItem
  index: number
  onSelect: (candidateId: number, name: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn(item.has_voted && 'border-emerald-500/30 bg-emerald-500/5')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{item.position.name}</CardTitle>
            {item.has_voted && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Voted
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {item.candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates for this position.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {item.candidates.map((candidate) => {
                const isSelected = item.my_candidate_id === candidate.id
                const isVoted = item.has_voted

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    disabled={isVoted}
                    onClick={() => onSelect(candidate.id, candidate.full_name)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'hover:border-primary/50 hover:bg-muted/50',
                      isVoted && !isSelected && 'opacity-50',
                      isVoted && 'cursor-default',
                    )}
                  >
                    <img
                      src={candidate.photo_url}
                      alt={candidate.full_name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{candidate.full_name}</p>
                      <p className="text-sm text-muted-foreground">{candidate.academic_year}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
