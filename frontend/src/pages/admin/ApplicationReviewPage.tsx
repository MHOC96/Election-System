import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Search } from 'lucide-react'
import { notifyApiError, notifySuccessMessage } from '@/lib/notify'
import { SUCCESS_MESSAGES } from '@/lib/user-messages'
import { fetchPositions } from '@/api/positions'
import { fetchAllApplications, reviewApplication, type CandidateApplication } from '@/api/applications'
import { fetchOngoingElection } from '@/api/elections'
import { POSITIONS_QUERY_KEY, POSITIONS_STALE_MS } from '@/lib/query-sync'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/design-system/FormField'
import {
  ApplicationReviewGroups,
  buildApplicationPositionGroups,
} from '@/components/applications/ApplicationReviewGroups'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { DataTablePagination, getPaginationMeta } from '@/components/shared/DataTablePagination'
import {
  applicationFilterBarClass,
  applicationFilterRowClass,
  applicationReviewGridClass,
  pageHeaderBlockClass,
  pageLayoutClass,
} from '@/lib/design-tokens'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const rejectSchema = z.object({
  rejection_reason: z.string().trim().min(1, 'Rejection reason is required'),
})

type RejectForm = z.infer<typeof rejectSchema>

const APPLICATIONS_PAGE_SIZE = 20

const STATUS_TABS = [
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

const YEAR_TABS = ['2nd Year', '3rd Year']

function ApplicationsSkeleton() {
  return (
    <div className={applicationReviewGridClass}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function ApplicationReviewPage() {
  const queryClient = useQueryClient()
  const [rejectingApp, setRejectingApp] = useState<CandidateApplication | null>(null)
  const [approvingApp, setApprovingApp] = useState<CandidateApplication | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatusTab, setActiveStatusTab] = useState<string>('PENDING_REVIEW')
  const [activeYearTab, setActiveYearTab] = useState<string>('2nd Year')
  const [page, setPage] = useState(1)

  const { data: ongoingElection, isLoading: loadingElection } = useQuery({
    queryKey: ['elections', 'ongoing'],
    queryFn: fetchOngoingElection,
  })

  const reviewOpen =
    ongoingElection?.current_phase === 'REVIEWING' ||
    ongoingElection?.current_phase === 'READY_FOR_VOTING'

  const { data: positions } = useQuery({
    queryKey: POSITIONS_QUERY_KEY,
    queryFn: fetchPositions,
    staleTime: POSITIONS_STALE_MS,
  })

  const positionFilterId =
    selectedPosition === 'all'
      ? undefined
      : positions?.find((position) => position.name === selectedPosition)?.id

  const { data: applicationsPage, isLoading: loadingApplications } = useQuery({
    queryKey: [
      'applications',
      'all',
      ongoingElection?.id,
      activeStatusTab,
      activeYearTab,
      selectedPosition,
      searchQuery,
      page,
    ],
    queryFn: () =>
      fetchAllApplications({
        status: activeStatusTab,
        election: ongoingElection?.id,
        academic_year: activeYearTab,
        position: positionFilterId,
        search: searchQuery.trim() || undefined,
        page,
        page_size: APPLICATIONS_PAGE_SIZE,
      }),
    enabled: !!ongoingElection && reviewOpen,
  })

  const applications = applicationsPage?.results ?? []
  const totalCount = applicationsPage?.count ?? 0
  const { totalPages } = getPaginationMeta(page, totalCount, APPLICATIONS_PAGE_SIZE)
  const canGoPrevious = !!applicationsPage?.previous && page > 1
  const canGoNext = !!applicationsPage?.next && page < totalPages

  useEffect(() => {
    setPage(1)
  }, [activeStatusTab, activeYearTab, selectedPosition, searchQuery])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const positionNames = Array.from(new Set((positions || []).map((position) => position.name)))
  const applicationGroups = buildApplicationPositionGroups(positionNames, applications)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
  })

  const reviewMutation = useMutation({
    mutationFn: (data: { id: number; action: 'APPROVE' | 'REJECT'; rejection_reason?: string }) =>
      reviewApplication(data.id, { action: data.action, rejection_reason: data.rejection_reason }),
    onMutate: (variables) => {
      setPendingId(variables.id)
    },
    onSuccess: (_, variables) => {
      notifySuccessMessage(
        SUCCESS_MESSAGES.applicationReviewed(
          variables.action === 'APPROVE' ? 'Approved' : 'Rejected',
        ),
      )
      void queryClient.invalidateQueries({ queryKey: ['applications', 'all'] })
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      if (variables.action === 'REJECT') {
        closeRejectDialog()
      } else {
        setApprovingApp(null)
      }
    },
    onError: (error) => notifyApiError(error, 'general'),
    onSettled: () => {
      setPendingId(null)
    },
  })

  const confirmApprove = () => {
    if (!approvingApp) return
    reviewMutation.mutate({ id: approvingApp.id, action: 'APPROVE' })
  }

  const openReject = (app: CandidateApplication) => {
    setRejectingApp(app)
    reset()
  }

  const closeRejectDialog = () => {
    setRejectingApp(null)
    reset()
  }

  const onRejectSubmit = (values: RejectForm) => {
    if (!rejectingApp) return
    reviewMutation.mutate({
      id: rejectingApp.id,
      action: 'REJECT',
      rejection_reason: values.rejection_reason,
    })
  }

  if (loadingElection) {
    return (
      <div className={pageLayoutClass}>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!ongoingElection || !reviewOpen) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Application Review" description="Review candidate applications" />
        <EmptyState
          icon={Clock}
          title="No applications to review"
          description="Applications can be reviewed after the application window closes and before voting starts."
        />
      </div>
    )
  }

  const statusLabel = activeStatusTab.toLowerCase().replace('_', ' ')

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <div className={pageHeaderBlockClass}>
          <PageHeader
            title="Application Review"
            description={`Review candidate applications for ${ongoingElection.name}`}
          />
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.secondary}>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className={applicationFilterBarClass}>
              <Tabs
                value={activeStatusTab}
                onValueChange={(value) => {
                  setActiveStatusTab(value)
                  setPage(1)
                }}
              >
                <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:h-10 sm:w-auto">
                  {STATUS_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="h-9 px-2 text-xs sm:px-4 sm:text-sm">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className={applicationFilterRowClass}>
                <div className="relative w-full sm:max-w-xs sm:flex-1">
                  <Label htmlFor="application-search" className="sr-only">
                    Search applications
                  </Label>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="application-search"
                    type="search"
                    placeholder="Search by name, CPM, or MC…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    className="pl-9"
                  />
                </div>

                <Tabs
                  value={activeYearTab}
                  onValueChange={(value) => {
                    setActiveYearTab(value)
                    setPage(1)
                  }}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
                    {YEAR_TABS.map((year) => (
                      <TabsTrigger key={year} value={year} className="h-8 text-xs sm:text-sm">
                        {year}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {positions && positions.length > 0 ? (
                  <div className="w-full sm:w-52">
                    <Label htmlFor="application-position" className="sr-only">
                      Filter by position
                    </Label>
                    <Select
                      value={selectedPosition}
                      onValueChange={(value) => {
                        setSelectedPosition(value)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger id="application-position">
                        <SelectValue placeholder="All positions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All positions</SelectItem>
                        {positions.map((pos) => (
                          <SelectItem key={pos.id} value={pos.name}>
                            {pos.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </Stagger>

      <Stagger delayMs={sectionDelays.tertiary}>
        <div className="space-y-4">
          {loadingApplications ? (
            <ApplicationsSkeleton />
          ) : !applications.length ? (
            <EmptyState
              icon={CheckCircle2}
              title={activeStatusTab === 'PENDING_REVIEW' ? 'All caught up!' : 'No applications'}
              description={`There are no ${statusLabel} applications for ${activeYearTab} right now.`}
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">{totalCount}</span>{' '}
                {statusLabel} application{totalCount === 1 ? '' : 's'} · {activeYearTab}
              </p>

              <ApplicationReviewGroups
                groups={applicationGroups}
                pendingId={pendingId}
                onApprove={setApprovingApp}
                onReject={openReject}
              />

              {totalPages > 1 ? (
                <Card>
                  <CardContent className="p-0">
                    <DataTablePagination
                      className="border-t-0"
                      page={page}
                      pageSize={APPLICATIONS_PAGE_SIZE}
                      totalCount={totalCount}
                      hasPrevious={canGoPrevious}
                      hasNext={canGoNext}
                      itemLabel="applications"
                      onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                      onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </Stagger>

      <ConfirmDialog
        open={!!approvingApp}
        title="Approve application?"
        description={`${approvingApp?.full_name ?? 'This applicant'} will be added as a candidate for ${approvingApp?.position_name ?? 'this position'}.`}
        confirmLabel="Approve"
        loading={reviewMutation.isPending}
        onCancel={() => setApprovingApp(null)}
        onConfirm={confirmApprove}
      />

      <Dialog open={!!rejectingApp} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectingApp?.full_name}'s application for{' '}
              {rejectingApp?.position_name}. The applicant will see this message.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onRejectSubmit)(e)} className="space-y-4">
            <FormField
              label="Rejection Reason"
              htmlFor="rejection_reason"
              error={errors.rejection_reason?.message}
              required
            >
              <Input
                id="rejection_reason"
                placeholder="e.g. Invalid document, does not meet academic year requirement"
                {...register('rejection_reason')}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRejectDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || reviewMutation.isPending}
              >
                {reviewMutation.isPending ? 'Rejecting…' : 'Reject application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
