import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Lock, Play, Plus, Square, Trash2, Vote } from 'lucide-react'
import {
  closeElection,
  createElection,
  deleteElection,
  fetchElections,
  startElection,
  stopElection,
} from '@/api/elections'
import { getApiErrorMessage } from '@/api/client'
import { ElectionResultsSheet } from '@/components/elections/ElectionResultsSheet'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ElectionStatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'
import { electionSchema, type ElectionForm } from '@/lib/form-schemas'
import type { Election } from '@/types/api'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function ElectionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<Election | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Election | null>(null)
  const [resultsElection, setResultsElection] = useState<Election | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ElectionForm>({
    resolver: zodResolver(electionSchema),
    defaultValues: { name: '' },
  })

  const { data: elections, isLoading } = useQuery({
    queryKey: ['elections'],
    queryFn: fetchElections,
  })

  const createMutation = useMutation({
    mutationFn: (values: ElectionForm) => createElection(values.name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      toast.success('Election created')
      closeCreateDialog()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'start' | 'stop' | 'close' }) => {
      if (action === 'start') return startElection(id)
      if (action === 'stop') return stopElection(id)
      return closeElection(id)
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-live'] })
      void queryClient.invalidateQueries({ queryKey: ['members-deletion-status'] })
      if (variables.action === 'close') {
        setCloseTarget(null)
        toast.success('Election closed')
      } else if (variables.action === 'start') {
        toast.success('Election started')
      } else {
        toast.success('Election stopped')
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteElection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-live'] })
      void queryClient.invalidateQueries({ queryKey: ['members-deletion-status'] })
      toast.success('Election deleted')
      setDeleteTarget(null)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const openCreateDialog = () => {
    reset({ name: '' })
    setDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setDialogOpen(false)
    reset({ name: '' })
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const onCreateSubmit = (values: ElectionForm) => {
    createMutation.mutate(values)
  }

  const openResults = (election: Election) => {
    setResultsElection(election)
    setResultsOpen(true)
  }

  const renderActions = (election: Election) => {
    const actions = []
    if (election.status === 'DRAFT' || election.status === 'STOPPED') {
      actions.push(
        <Button
          key="start"
          size="sm"
          disabled={actionMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            actionMutation.mutate({ id: election.id, action: 'start' })
          }}
        >
          <Play className="h-4 w-4" />
          Start
        </Button>,
      )
    }
    if (election.status === 'ACTIVE') {
      actions.push(
        <Button
          key="stop"
          size="sm"
          variant="outline"
          disabled={actionMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            actionMutation.mutate({ id: election.id, action: 'stop' })
          }}
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>,
      )
    }
    if (election.status === 'ACTIVE' || election.status === 'STOPPED') {
      actions.push(
        <Button
          key="close"
          size="sm"
          variant="destructive"
          disabled={actionMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            setCloseTarget(election)
          }}
        >
          <Lock className="h-4 w-4" />
          Close
        </Button>,
      )
    }
    if (election.status === 'CLOSED') {
      actions.push(
        <Button
          key="delete"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={deleteMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            setDeleteTarget(election)
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>,
      )
    }
    return actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : null
  }

  return (
    <div className={pageLayoutClass}>
      <PageHeader
        title="Elections"
        description="Create and manage election lifecycle"
        action={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New Election
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !elections?.length ? (
        <EmptyState
          icon={Vote}
          title="No elections"
          description="Create an election, then start it when ready for voting."
        />
      ) : (
        <div className="grid gap-4">
          {elections.map((election) => {
            const isClosed = election.status === 'CLOSED'

            return (
              <Card
                key={election.id}
                className={cn(
                  isClosed && 'cursor-pointer transition-colors hover:bg-muted/30',
                )}
                onClick={() => isClosed && openResults(election)}
                onKeyDown={(event) => {
                  if (isClosed && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    openResults(election)
                  }
                }}
                tabIndex={isClosed ? 0 : undefined}
                role={isClosed ? 'button' : undefined}
                aria-label={isClosed ? `View results for ${election.name}` : undefined}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{election.name}</CardTitle>
                      <ElectionStatusBadge status={election.status} />
                    </div>
                    <CardDescription className="mt-1">
                      Created {formatDate(election.created_at)}
                      {election.started_at && ` · Started ${formatDate(election.started_at)}`}
                      {election.closed_at && ` · Closed ${formatDate(election.closed_at)}`}
                    </CardDescription>
                    {isClosed ? (
                      <p className="mt-2 flex items-center gap-1 text-sm text-primary">
                        View full results
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </p>
                    ) : null}
                  </div>
                  <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    {renderActions(election)}
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Election</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onCreateSubmit)(e)} className="space-y-4">
            <FormField
              label="Election Name"
              htmlFor="election-name"
              error={errors.name?.message}
              required
            >
              <Input
                id="election-name"
                placeholder="e.g. 2026 Executive Election"
                {...register('name')}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!closeTarget}
        title="Close election?"
        description={`Permanently close "${closeTarget?.name}"? This ends the election and cannot be undone. No further votes will be accepted.`}
        confirmLabel="Close election"
        destructive
        loading={actionMutation.isPending}
        onCancel={() => setCloseTarget(null)}
        onConfirm={() =>
          closeTarget && actionMutation.mutate({ id: closeTarget.id, action: 'close' })
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete closed election?"
        description={`Delete "${deleteTarget?.name}" and all associated vote records? Export reports first if you need a permanent archive.`}
        confirmLabel="Delete election"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      <ElectionResultsSheet
        election={resultsElection}
        open={resultsOpen}
        onOpenChange={setResultsOpen}
      />
    </div>
  )
}
