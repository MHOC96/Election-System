import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { ElectionCountdownHero } from '@/components/elections/ElectionCountdownHero'
import { ElectionLifecycleRail } from '@/components/elections/ElectionLifecycleRail'
import { ElectionNextStepBanner } from '@/components/elections/ElectionNextStepBanner'
import { CountdownExpiryWatcher } from '@/components/shared/CountdownDisplay'
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
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { DateTimeSplitInput } from '@/components/design-system/DateTimeSplitInput'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'
import { fetchMembers } from '@/api/members'
import { fetchPositions } from '@/api/positions'
import {
  canCreateElection,
  canScheduleElection,
  getCreateElectionBlockReason,
  getElectionScheduleBlockReason,
} from '@/lib/election-readiness'
import { MEMBERS_STALE_MS, POSITIONS_QUERY_KEY, POSITIONS_STALE_MS, refreshDashboard, markQueriesStale } from '@/lib/query-sync'
import { electionSchema, type ElectionForm } from '@/lib/form-schemas'
import type { Election } from '@/types/api'
import { cn, formatDate } from '@/lib/utils'
import { isoToLocalInput, localInputToIso } from '@/lib/datetime'
import {
  canShowStartVotingAction,
  electionNeedsPhaseRefresh,
  getElectionCountdown,
  getElectionNextStep,
} from '@/lib/election-lifecycle-ui'
import { notifyError } from '@/lib/notify'

export function ElectionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<Election | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Election | null>(null)
  const [resultsElection, setResultsElection] = useState<Election | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ElectionForm>({
    resolver: zodResolver(electionSchema),
    defaultValues: { name: '', application_start_at: '', application_end_at: '', require_all_positions_filled: true },
  })

  // State to hold editing election
  const [editingElection, setEditingElection] = useState<Election | null>(null)

  const { data: elections, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['elections'],
    queryFn: fetchElections,
    refetchInterval: (query) => {
      const list = query.state.data
      if (!list?.some(electionNeedsPhaseRefresh)) return false
      return 10_000
    },
  })

  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: POSITIONS_QUERY_KEY,
    queryFn: fetchPositions,
    staleTime: POSITIONS_STALE_MS,
  })

  const { data: membersPage, isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'readiness'],
    queryFn: () => fetchMembers(undefined, 1, 1),
    staleTime: MEMBERS_STALE_MS,
  })

  const readinessInput = {
    elections,
    positionCount: positions?.length ?? 0,
    memberCount: membersPage?.count ?? 0,
  }

  const readinessLoading = isLoading || positionsLoading || membersLoading
  const canCreate = canCreateElection(readinessInput)
  const createElectionHint = getCreateElectionBlockReason(readinessInput)
  const electionScheduleReady = canScheduleElection(readinessInput)
  const electionScheduleBlockReason = getElectionScheduleBlockReason(readinessInput)

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
      notifyError(createElectionHint ?? 'Cannot create a new election right now.')
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
      if (!editingElection.voting_started) {
        payload.voting_start_at = localInputToIso(values.voting_start_at)
      }
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



  const canOpenEditDialog = (election: Election) => {
    if (election.status === 'ARCHIVED') return false
    return (
      canEditApplicationDates(election) ||
      canEditVotingDates(election)
    )
  }

  // Show application date fields only when voting has NOT yet started
  // (DRAFT = both dates, SCHEDULED/APPLICATIONS_OPEN = only end date via disabled start)
  const showApplicationFieldsInEdit =
    !editingElection ||
    (canEditApplicationDates(editingElection) &&
      !['VOTING_OPEN', 'VOTING_CLOSED', 'RESULTS_PUBLISHED', 'ARCHIVED'].includes(
        editingElection.current_phase,
      ))

  // Show voting fields when:
  // - READY_FOR_VOTING: both dates editable + require toggle (pre-voting setup)
  // - VOTING_OPEN: start locked, only end editable (voting in progress)
  const showVotingFieldsInEdit =
    !!editingElection &&
    ['READY_FOR_VOTING', 'VOTING_OPEN'].includes(editingElection.current_phase)

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
          disabled={actionMutation.isPending || !hasAppDates}
          title={!hasAppDates ? 'Set application start and end dates first' : undefined}
          onClick={(event) => {
            event.stopPropagation()
            actionMutation.mutate({ id: election.id, action: 'schedule' })
          }}
        >
          <Play className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Open Applications</span>
        </Button>,
      )
    }

    if (canShowStartVotingAction(election)) {
      actions.push(
        <Button
          key="start-voting"
          size="sm"
          disabled={startVotingMutation.isPending}
          onClick={(event) => {
            event.stopPropagation()
            startVotingMutation.mutate({ id: election.id })
          }}
        >
          <Play className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Start Voting</span>
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
          <Lock className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Archive</span>
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
        <Trash2 className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Delete</span>
      </Button>,
    )
    
    return actions.length ? (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">{actions}</div>
    ) : null
  }

  if (isError && !elections) {
    return (
      <div className={pageLayoutClass}>
        <Stagger delayMs={sectionDelays.header}>
          <PageHeader title="Elections" description="Create and manage election lifecycle" />
        </Stagger>
        <Stagger delayMs={sectionDelays.primary}>
          <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
        </Stagger>
      </div>
    )
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
                : (createElectionHint ?? 'Finish the current election before creating a new one.')
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
            const countdown = getElectionCountdown(election)
            const nextStep = isClosed ? null : getElectionNextStep(election)

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
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{election.name}</CardTitle>
                        <ElectionStatusBadge status={election.current_phase} />
                      </div>
                      <CardDescription className="mt-1">
                        Created {formatDate(election.created_at)}
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

                    {!isClosed ? (
                      <ElectionLifecycleRail phase={election.current_phase} />
                    ) : null}

                    {!isClosed && nextStep ? <ElectionNextStepBanner step={nextStep} /> : null}

                    {!isClosed && countdown ? (
                      <>
                        <CountdownExpiryWatcher
                          targetAt={countdown.targetAt}
                          onExpire={() => {
                            void queryClient.invalidateQueries({ queryKey: ['elections'] })
                            refreshDashboard(queryClient)
                          }}
                        />
                        <ElectionCountdownHero
                          variant={countdown.variant}
                          electionName={election.name}
                          targetAt={countdown.targetAt}
                        />
                      </>
                    ) : null}
                  </div>
                  <div
                    className="w-full shrink-0 sm:w-auto"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
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
            {!editingElection ? (
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
            ) : (
              <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Election
                </p>
                <p className="mt-1 font-semibold text-foreground">{editingElection.name}</p>
              </div>
            )}

            {showApplicationFieldsInEdit ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Applications Start"
                  htmlFor="application_start_at"
                  error={errors.application_start_at?.message}
                  hint="Select the date and time applications open."
                >
                  <Controller
                    name="application_start_at"
                    control={control}
                    render={({ field }) => (
                      <DateTimeSplitInput
                        id="application_start_at"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={!!editingElection && editingElection.status !== 'DRAFT'}
                      />
                    )}
                  />
                </FormField>

                <FormField
                  label="Applications End"
                  htmlFor="application_end_at"
                  error={errors.application_end_at?.message}
                  hint="Select the date and time applications close."
                >
                  <Controller
                    name="application_end_at"
                    control={control}
                    render={({ field }) => (
                      <DateTimeSplitInput
                        id="application_end_at"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>
              </div>
            ) : null}

            {showVotingFieldsInEdit ? (
              <div className="grid grid-cols-1 gap-4 border-t pt-4">
                {editingElection?.current_phase === 'READY_FOR_VOTING' ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        label="Voting Start"
                        htmlFor="edit_voting_start_at"
                        error={errors.voting_start_at?.message}
                        required
                        hint="When members can begin casting votes."
                      >
                        <Controller
                          name="voting_start_at"
                          control={control}
                          render={({ field }) => (
                            <DateTimeSplitInput
                              id="edit_voting_start_at"
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Voting End"
                        htmlFor="edit_voting_end_at"
                        error={errors.voting_end_at?.message}
                        required
                        hint="When voting closes for all members."
                      >
                        <Controller
                          name="voting_end_at"
                          control={control}
                          render={({ field }) => (
                            <DateTimeSplitInput
                              id="edit_voting_end_at"
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                      </FormField>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="require-positions-filled"
                        type="checkbox"
                        className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                        {...register('require_all_positions_filled')}
                      />
                      <label htmlFor="require-positions-filled" className="text-sm font-medium leading-none">
                        Require candidates for all positions to start voting
                      </label>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      label="Voting Start"
                      htmlFor="edit_voting_start_at"
                      error={errors.voting_start_at?.message}
                    >
                      <Controller
                        name="voting_start_at"
                        control={control}
                        render={({ field }) => (
                          <DateTimeSplitInput
                            id="edit_voting_start_at"
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            disabled
                          />
                        )}
                      />
                    </FormField>
                    <FormField
                      label="Voting End"
                      htmlFor="edit_voting_end_at"
                      error={errors.voting_end_at?.message}
                      hint="Extend or adjust when voting closes."
                    >
                      <Controller
                        name="voting_end_at"
                        control={control}
                        render={({ field }) => (
                          <DateTimeSplitInput
                            id="edit_voting_end_at"
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-end">
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
