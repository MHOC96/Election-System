import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Lock, Play, Plus, Square, Trash2, Vote } from 'lucide-react'
import {
  archiveElection,
  createElection,
  deleteElection,
  fetchElections,
  scheduleElection,
  publishElectionResults,
  updateElection,
} from '@/api/elections'
import { fetchCandidates } from '@/api/candidates'
import { fetchPositions } from '@/api/positions'
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
import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'
import { canScheduleElection, getElectionScheduleBlockReason } from '@/lib/election-readiness'
import { refreshDashboard, markQueriesStale } from '@/lib/query-sync'
import { electionSchema, type ElectionForm } from '@/lib/form-schemas'
import type { Election } from '@/types/api'
import { cn, formatDate } from '@/lib/utils'
import { notifyError } from '@/lib/notify'

export function ElectionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<Election | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Election | null>(null)
  const [resultsElection, setResultsElection] = useState<Election | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)

  const [scheduleTarget, setScheduleTarget] = useState<Election | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ElectionForm>({
    resolver: zodResolver(electionSchema),
    defaultValues: { name: '', application_start_at: '', application_end_at: '' },
  })

  const {
    register: registerSchedule,
    handleSubmit: handleScheduleSubmit,
    reset: resetSchedule,
    formState: { errors: scheduleErrors, isSubmitting: isScheduleSubmitting },
  } = useForm<{
    voting_start_at: string
    voting_end_at: string
  }>({
    defaultValues: { voting_start_at: '', voting_end_at: '' },
  })

  // State to hold editing election
  const [editingElection, setEditingElection] = useState<Election | null>(null)

  const { data: elections, isLoading } = useQuery({
    queryKey: ['elections'],
    queryFn: fetchElections,
  })

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => fetchCandidates(),
    refetchOnMount: 'always',
  })

  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchOnMount: 'always',
  })

  const readinessLoading = false
  const canCreate = true
  const createElectionHint = null
  const electionScheduleReady = canScheduleElection()
  const electionScheduleBlockReason = getElectionScheduleBlockReason()

  const createMutation = useMutation({
    mutationFn: (values: ElectionForm) => createElection(values.name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      refreshDashboard(queryClient)
      closeCreateDialog()
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; values: Partial<ElectionForm> }) => updateElection(data.id, data.values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      refreshDashboard(queryClient)
      closeCreateDialog()
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'schedule' | 'publish' | 'archive' }) => {
      if (action === 'schedule') return scheduleElection(id)
      if (action === 'publish') return publishElectionResults(id)
      return archiveElection(id)
    },
    onMutate: ({ action }) => {
      if (action === 'archive') {
        setCloseTarget(null)
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Election[]>(['elections'], (old) =>
        (old ?? []).map((election) =>
          election.id === updated.id ? updated : election,
        ),
      )
      refreshDashboard(queryClient)
      markQueriesStale(queryClient, ['members-deletion-status'])
    },
    onError: (error, variables) => {
      if (variables.action === 'archive') {
        void queryClient.invalidateQueries({ queryKey: ['elections'] })
      }
      notifyError(getApiErrorMessage(error))
    },
  })

  const scheduleFlowMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      // First update the dates
      await updateElection(id, values)
      // Then schedule it
      return scheduleElection(id)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Election[]>(['elections'], (old) =>
        (old ?? []).map((election) =>
          election.id === updated.id ? updated : election,
        ),
      )
      refreshDashboard(queryClient)
      markQueriesStale(queryClient, ['members-deletion-status'])
      closeScheduleDialog()
    },
    onError: (error) => {
      notifyError(getApiErrorMessage(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteElection,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['elections'] })
      const previous = queryClient.getQueryData<Election[]>(['elections'])
      queryClient.setQueryData<Election[]>(['elections'], (old) =>
        (old ?? []).filter((election) => election.id !== id),
      )
      setDeleteTarget(null)
      return { previous }
    },
    onSuccess: () => {
      refreshDashboard(queryClient)
      markQueriesStale(queryClient, ['members-deletion-status'])
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['elections'], context.previous)
      }
      notifyError(getApiErrorMessage(error))
    },
  })

  const openCreateDialog = () => {
    if (!canCreate) {
      notifyError(createElectionHint ?? 'Add candidates first.')
      return
    }
    reset({ name: '' })
    setDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setDialogOpen(false)
    setEditingElection(null)
    reset({ name: '', application_start_at: '', application_end_at: '' })
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const openEditDialog = (election: Election) => {
    setEditingElection(election)
    reset({
      name: election.name,
      application_start_at: election.application_start_at ? new Date(election.application_start_at).toISOString().slice(0, 16) : '',
      application_end_at: election.application_end_at ? new Date(election.application_end_at).toISOString().slice(0, 16) : '',
      voting_start_at: election.voting_start_at ? new Date(election.voting_start_at).toISOString().slice(0, 16) : '',
      voting_end_at: election.voting_end_at ? new Date(election.voting_end_at).toISOString().slice(0, 16) : '',
    })
    setDialogOpen(true)
  }

  const openScheduleDialog = (election: Election) => {
    setScheduleTarget(election)
    resetSchedule({
      voting_start_at: election.voting_start_at ? new Date(election.voting_start_at).toISOString().slice(0, 16) : '',
      voting_end_at: election.voting_end_at ? new Date(election.voting_end_at).toISOString().slice(0, 16) : '',
    })
    setScheduleDialogOpen(true)
  }

  const closeScheduleDialog = () => {
    setScheduleDialogOpen(false)
    setScheduleTarget(null)
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const onCreateSubmit = (values: ElectionForm) => {
    const payload: Partial<ElectionForm> & { name: string } = {
      ...values,
      application_start_at: values.application_start_at || undefined,
      application_end_at: values.application_end_at || undefined,
    }
    if (editingElection?.status === 'SCHEDULED') {
      payload.voting_start_at = values.voting_start_at || undefined
      payload.voting_end_at = values.voting_end_at || undefined
    } else {
      delete payload.voting_start_at
      delete payload.voting_end_at
    }

    if (editingElection) {
      updateMutation.mutate({ id: editingElection.id, values: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const onScheduleSubmit = (values: any) => {
    if (!scheduleTarget) return
    const payload = {
      voting_start_at: values.voting_start_at || undefined,
      voting_end_at: values.voting_end_at || undefined,
    }
    scheduleFlowMutation.mutate({ id: scheduleTarget.id, values: payload })
  }

  const openResults = (election: Election) => {
    setResultsElection(election)
    setResultsOpen(true)
  }

  const renderActions = (election: Election) => {
    const actions = []
    
    const now = new Date()
    const appEnd = election.application_end_at ? new Date(election.application_end_at) : null
    const votingEnd = election.voting_end_at ? new Date(election.voting_end_at) : null
    
    let canEdit = false;
    if (election.status === 'DRAFT') {
      canEdit = !appEnd || now < appEnd;
    } else if (election.status === 'SCHEDULED') {
      canEdit = !votingEnd || now < votingEnd;
    }

    if (canEdit) {
      actions.push(
        <Button
          key="edit"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation()
            openEditDialog(election)
          }}
        >
          Edit
        </Button>
      )
    }

    if (election.status === 'DRAFT') {
      const canSchedule = electionScheduleReady
      actions.push(
        <Button
          key="schedule"
          size="sm"
          disabled={actionMutation.isPending || !canSchedule}
          onClick={(event) => {
            event.stopPropagation()
            openScheduleDialog(election)
          }}
        >
          <Play className="h-4 w-4 mr-1" />
          Schedule
        </Button>,
      )
    }

    if (election.current_phase === 'VOTING_CLOSED') {
      actions.push(
        <Button
          key="publish"
          size="sm"
          variant="outline"
          disabled={actionMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            actionMutation.mutate({ id: election.id, action: 'publish' })
          }}
        >
          Publish Results
        </Button>,
      )
    }

    if (election.status !== 'ARCHIVED' && election.status !== 'DRAFT') {
      actions.push(
        <Button
          key="archive"
          size="sm"
          variant="destructive"
          disabled={actionMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            setCloseTarget(election)
          }}
        >
          <Lock className="h-4 w-4 mr-1" />
          Archive
        </Button>,
      )
    }

    if (election.status === 'DRAFT' || election.status === 'ARCHIVED') {
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
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>,
      )
    }
    
    return actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : null
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Elections"
          description="Create and manage election lifecycle"
          action={
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={openCreateDialog}
                disabled={readinessLoading || !canCreate}
                title={createElectionHint ?? undefined}
              >
                <Plus className="h-4 w-4" />
                New Election
              </Button>
              {!readinessLoading && createElectionHint ? (
                <p className="text-xs text-muted-foreground">{createElectionHint}</p>
              ) : null}
            </div>
          }
        />
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !elections?.length ? (
        <EmptyState
          icon={Vote}
          title="No elections"
          description={
              canCreate
                ? 'Create an election to begin the process.'
                : 'Add candidates first, then create an election.'
          }
        />
      ) : (
        <StaggerChildren className="grid gap-4" staggerMs={70}>
          {elections.map((election) => {
            const isClosed = election.status === 'ARCHIVED' || election.results_published
            const showStartHint =
              election.status === 'DRAFT' &&
              !electionScheduleReady &&
              electionScheduleBlockReason

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
                      <ElectionStatusBadge status={election.current_phase} />
                    </div>
                    <CardDescription className="mt-1">
                      Created {formatDate(election.created_at)}
                      {election.application_start_at && ` · Apps open ${formatDate(election.application_start_at)}`}
                      {election.voting_start_at && ` · Voting starts ${formatDate(election.voting_start_at)}`}
                    </CardDescription>
                    {isClosed ? (
                      <p className="mt-2 flex items-center gap-1 text-sm text-primary">
                        View full results
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </p>
                    ) : null}
                    {showStartHint ? (
                      <p className="mt-2 text-sm text-muted-foreground">{electionScheduleBlockReason}</p>
                    ) : null}
                  </div>
                  <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    {renderActions(election)}
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </StaggerChildren>
      )}
      </Stagger>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingElection ? 'Edit Election' : 'Create Election'}</DialogTitle>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Applications Start" htmlFor="application_start_at" error={errors.application_start_at?.message}>
                <Input id="application_start_at" type="datetime-local" {...register('application_start_at')} />
              </FormField>
              
              <FormField label="Applications End" htmlFor="application_end_at" error={errors.application_end_at?.message}>
                <Input id="application_end_at" type="datetime-local" {...register('application_end_at')} />
              </FormField>
            </div>
            
            {editingElection?.status === 'SCHEDULED' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <FormField label="Voting Start" htmlFor="edit_voting_start_at" error={errors.voting_start_at?.message}>
                  <Input id="edit_voting_start_at" type="datetime-local" {...register('voting_start_at')} />
                </FormField>
                
                <FormField label="Voting End" htmlFor="edit_voting_end_at" error={errors.voting_end_at?.message}>
                  <Input id="edit_voting_end_at" type="datetime-local" {...register('voting_end_at')} />
                </FormField>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={(open) => !open && closeScheduleDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Election</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleScheduleSubmit(onScheduleSubmit)(e)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the dates for voting to officially start this election.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Voting Start" htmlFor="voting_start_at" error={scheduleErrors.voting_start_at?.message as string}>
                <Input id="voting_start_at" type="datetime-local" required {...registerSchedule('voting_start_at')} />
              </FormField>
              
              <FormField label="Voting End" htmlFor="voting_end_at" error={scheduleErrors.voting_end_at?.message as string}>
                <Input id="voting_end_at" type="datetime-local" required {...registerSchedule('voting_end_at')} />
              </FormField>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeScheduleDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isScheduleSubmitting || scheduleFlowMutation.isPending}>
                {scheduleFlowMutation.isPending ? 'Scheduling...' : 'Schedule Election'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!closeTarget}
        title="Archive election?"
        description={`Permanently archive "${closeTarget?.name}"? This ends the active status of the election and makes it historical. No further changes can be made.`}
        confirmLabel="Archive election"
        destructive
        loading={actionMutation.isPending}
        onCancel={() => setCloseTarget(null)}
        onConfirm={() =>
          closeTarget && actionMutation.mutate({ id: closeTarget.id, action: 'archive' })
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete election?"
        description={
          deleteTarget?.status === 'ARCHIVED'
            ? `Delete "${deleteTarget?.name}" and all associated vote records? Export reports first if you need a permanent archive.`
            : `Remove draft election "${deleteTarget?.name}"? This cannot be undone.`
        }
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
