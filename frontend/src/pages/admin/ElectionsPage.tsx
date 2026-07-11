import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Lock, Play, Plus, Trash2, Vote } from 'lucide-react'
import {
  archiveElection,
  createElection,
  deleteElection,
  fetchElections,
  scheduleElection,
  startVotingElection,
  publishElectionResults,
  updateElection,
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
import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'
import { canScheduleElection, getElectionScheduleBlockReason } from '@/lib/election-readiness'
import { refreshDashboard, markQueriesStale } from '@/lib/query-sync'
import { electionSchema, type ElectionForm } from '@/lib/form-schemas'
import type { Election } from '@/types/api'
import { cn, formatDate } from '@/lib/utils'
import { isoToLocalInput, localInputToIso } from '@/lib/datetime'
import { notifyError } from '@/lib/notify'

export function ElectionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<Election | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Election | null>(null)
  const [resultsElection, setResultsElection] = useState<Election | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)

  const [startVotingTarget, setStartVotingTarget] = useState<Election | null>(null)
  const [startVotingDialogOpen, setStartVotingDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ElectionForm>({
    resolver: zodResolver(electionSchema),
    defaultValues: { name: '', application_start_at: '', application_end_at: '', require_all_positions_filled: true },
  })

  const {
    register: registerStartVoting,
    handleSubmit: handleStartVotingSubmit,
    reset: resetStartVoting,
    formState: { errors: startVotingErrors, isSubmitting: isStartVotingSubmitting },
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

  const readinessLoading = isLoading
  const canCreate = true
  const createElectionHint = null
  const electionScheduleReady = canScheduleElection()
  const electionScheduleBlockReason = getElectionScheduleBlockReason()

  const createMutation = useMutation({
    mutationFn: (values: ElectionForm) => createElection(values),
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

  const openApplicationsMutation = useMutation({
    mutationFn: scheduleElection,
    onSuccess: (updated) => {
      queryClient.setQueryData<Election[]>(['elections'], (old) =>
        (old ?? []).map((election) =>
          election.id === updated.id ? updated : election,
        ),
      )
      refreshDashboard(queryClient)
      markQueriesStale(queryClient, ['members-deletion-status'])
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const startVotingMutation = useMutation({
    mutationFn: async ({ id, voting_start_at, voting_end_at }: { id: number; voting_start_at?: string; voting_end_at?: string }) =>
      startVotingElection(id, voting_start_at, voting_end_at),
    onSuccess: (updated) => {
      queryClient.setQueryData<Election[]>(['elections'], (old) =>
        (old ?? []).map((election) =>
          election.id === updated.id ? updated : election,
        ),
      )
      refreshDashboard(queryClient)
      closeStartVotingDialog()
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
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
      closeCreateDialog()
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
    reset({ name: '', application_start_at: '', application_end_at: '', require_all_positions_filled: true })
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const openEditDialog = (election: Election) => {
    setEditingElection(election)
    reset({
      name: election.name,
      application_start_at: isoToLocalInput(election.application_start_at),
      application_end_at: isoToLocalInput(election.application_end_at),
      voting_start_at: isoToLocalInput(election.voting_start_at),
      voting_end_at: isoToLocalInput(election.voting_end_at),
      require_all_positions_filled: election.require_all_positions_filled ?? true,
    })
    setDialogOpen(true)
  }

  const openStartVotingDialog = (election: Election) => {
    setStartVotingTarget(election)
    resetStartVoting({
      voting_start_at: isoToLocalInput(election.voting_start_at),
      voting_end_at: isoToLocalInput(election.voting_end_at),
    })
    setStartVotingDialogOpen(true)
  }

  const closeStartVotingDialog = () => {
    setStartVotingDialogOpen(false)
    setStartVotingTarget(null)
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const onCreateSubmit = (values: ElectionForm) => {
    const payload: Partial<ElectionForm> & { name: string, require_all_positions_filled?: boolean } = {
      name: values.name,
      require_all_positions_filled: values.require_all_positions_filled,
    }

    if (!editingElection || canEditApplicationDates(editingElection)) {
      payload.application_start_at = localInputToIso(values.application_start_at)
      payload.application_end_at = localInputToIso(values.application_end_at)
    }

    if (editingElection && showVotingFieldsInEdit && canEditVotingDates(editingElection)) {
      payload.voting_start_at = localInputToIso(values.voting_start_at)
      payload.voting_end_at = localInputToIso(values.voting_end_at)
    }

    if (editingElection) {
      updateMutation.mutate({ id: editingElection.id, values: payload })
    } else {
      createMutation.mutate({
        name: values.name,
        application_start_at: localInputToIso(values.application_start_at),
        application_end_at: localInputToIso(values.application_end_at),
        voting_start_at: localInputToIso(values.voting_start_at),
        voting_end_at: localInputToIso(values.voting_end_at),
        require_all_positions_filled: values.require_all_positions_filled,
      })
    }
  }

  const requestDeleteFromEdit = () => {
    if (!editingElection) return
    setDeleteTarget(editingElection)
  }

  const onStartVotingSubmit = (values: { voting_start_at: string; voting_end_at: string }) => {
    if (!startVotingTarget) return
    startVotingMutation.mutate({
      id: startVotingTarget.id,
      voting_start_at: localInputToIso(values.voting_start_at),
      voting_end_at: localInputToIso(values.voting_end_at),
    })
  }


  const getDeleteDescription = (election: Election) => {
    if (election.status === 'DRAFT') {
      return `Delete "${election.name}"? This cannot be undone.`
    }
    return `Delete "${election.name}" and all related votes, applications, and candidates? This permanently removes the election and cannot be undone.`
  }

  const canEditApplicationDates = (election: Election) => {
    const now = new Date()
    const appEnd = election.application_end_at ? new Date(election.application_end_at) : null
    if (election.status === 'DRAFT') return true
    if (election.status === 'SCHEDULED' && appEnd) return now < appEnd
    return election.status === 'SCHEDULED' && !appEnd
  }

  const canEditVotingDates = (election: Election) => {
    if (['VOTING_CLOSED', 'RESULTS_PUBLISHED', 'ARCHIVED'].includes(election.current_phase)) return false
    return true
  }

  const isApplicationPeriodEnded = (election: Election) => {
    if (!election.application_end_at) return false
    return new Date() >= new Date(election.application_end_at)
  }

  const canOpenEditDialog = (election: Election) => {
    if (election.status === 'ARCHIVED') return false
    return (
      canEditApplicationDates(election) ||
      canEditVotingDates(election)
    )
  }

  const showApplicationFieldsInEdit =
    !editingElection || canEditApplicationDates(editingElection)

  const showVotingFieldsInEdit =
    !!editingElection && isApplicationPeriodEnded(editingElection) && canEditVotingDates(editingElection)

  const openResults = (election: Election) => {
    setResultsElection(election)
    setResultsOpen(true)
  }

  const renderActions = (election: Election) => {
    const actions = []

    if (canOpenEditDialog(election)) {
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
      const hasAppDates = Boolean(election.application_start_at && election.application_end_at)
      actions.push(
        <Button
          key="open-apps"
          size="sm"
          disabled={openApplicationsMutation.isPending || !hasAppDates}
          title={!hasAppDates ? 'Set application start and end dates first' : undefined}
          onClick={(event) => {
            event.stopPropagation()
            openApplicationsMutation.mutate(election.id)
          }}
        >
          <Play className="h-4 w-4 mr-1" />
          Open Applications
        </Button>,
      )
    }

    if (election.current_phase === 'READY_FOR_VOTING') {
      actions.push(
        <Button
          key="start-voting"
          size="sm"
          disabled={startVotingMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            if (election.voting_end_at) {
              startVotingMutation.mutate({ id: election.id })
            } else {
              openStartVotingDialog(election)
            }
          }}
        >
          <Play className="h-4 w-4 mr-1" />
          Start Voting
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

    if (election.current_phase === 'RESULTS_PUBLISHED') {
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
                <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{election.name}</CardTitle>
                      <ElectionStatusBadge status={election.current_phase} />
                    </div>
                    <CardDescription className="mt-1">
                      Created {formatDate(election.created_at)}
                      {election.application_start_at && ` · Apps ${formatDate(election.application_start_at)} – ${election.application_end_at ? formatDate(election.application_end_at) : '…'}`}
                      {election.voting_start_at && ` · Voting ${formatDate(election.voting_start_at)} – ${election.voting_end_at ? formatDate(election.voting_end_at) : '…'}`}
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
            
            {showApplicationFieldsInEdit ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Applications Start" htmlFor="application_start_at" error={errors.application_start_at?.message}>
                  <Input id="application_start_at" type="datetime-local" {...register('application_start_at')} />
                </FormField>

                <FormField label="Applications End" htmlFor="application_end_at" error={errors.application_end_at?.message}>
                  <Input id="application_end_at" type="datetime-local" {...register('application_end_at')} />
                </FormField>
              </div>
            ) : null}

            {showVotingFieldsInEdit ? (
              <div className="grid grid-cols-1 gap-4 border-t pt-4">
                <FormField label="Voting Start" htmlFor="edit_voting_start_at" error={errors.voting_start_at?.message}>
                  <Input
                    id="edit_voting_start_at"
                    type="datetime-local"
                    disabled={editingElection ? !canEditVotingDates(editingElection) : false}
                    {...register('voting_start_at')}
                  />
                </FormField>

                <FormField label="Voting End" htmlFor="edit_voting_end_at" error={errors.voting_end_at?.message}>
                  <Input
                    id="edit_voting_end_at"
                    type="datetime-local"
                    disabled={editingElection ? !canEditVotingDates(editingElection) : false}
                    {...register('voting_end_at')}
                  />
                </FormField>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="require-positions-filled"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    {...register('require_all_positions_filled')}
                  />
                  <label htmlFor="require-positions-filled" className="text-sm font-medium leading-none">
                    Require candidates for all positions to start voting
                  </label>
                </div>
              </div>
            ) : null}
            
            <DialogFooter className="gap-2 sm:justify-between">
              {editingElection ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={requestDeleteFromEdit}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2 sm:ml-auto">
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={startVotingDialogOpen} onOpenChange={(open) => !open && closeStartVotingDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Voting</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleStartVotingSubmit(onStartVotingSubmit)(e)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set when voting will start and end. If the start time is empty or in the past, voting begins immediately.
            </p>

            <FormField label="Voting Start (Optional)" htmlFor="start_voting_start_at" error={startVotingErrors.voting_start_at?.message as string}>
              <Input id="start_voting_start_at" type="datetime-local" {...registerStartVoting('voting_start_at')} />
            </FormField>

            <FormField label="Voting End" htmlFor="start_voting_end_at" error={startVotingErrors.voting_end_at?.message as string}>
              <Input id="start_voting_end_at" type="datetime-local" required {...registerStartVoting('voting_end_at')} />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeStartVotingDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isStartVotingSubmitting || startVotingMutation.isPending}>
                {startVotingMutation.isPending ? 'Starting...' : 'Start Voting'}
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
        description={deleteTarget ? getDeleteDescription(deleteTarget) : ''}
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
