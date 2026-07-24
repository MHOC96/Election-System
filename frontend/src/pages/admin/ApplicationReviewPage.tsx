import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/design-system/FormField'
import {
  ApplicationReviewGroups,
  buildApplicationPositionGroups,
} from '@/components/applications/ApplicationReviewGroups'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { DataTablePagination, getPaginationMeta } from '@/components/shared/DataTablePagination'
import { pageHeaderBlockClass, pageLayoutClass, dataTableShellClass } from '@/lib/design-tokens'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const rejectSchema = z.object({
  rejection_reason: z.string().trim().min(1, 'Rejection reason is required'),
})

type RejectForm = z.infer<typeof rejectSchema>

const APPLICATIONS_PAGE_SIZE = 20

export function ApplicationReviewPage() {
  const queryClient = useQueryClient()
  const [rejectingApp, setRejectingApp] = useState<CandidateApplication | null>(null)
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
    mutationFn: (data: { id: number, action: 'APPROVE' | 'REJECT', rejection_reason?: string }) =>
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
      }
    },
    onError: (error) => notifyApiError(error, 'general'),
    onSettled: () => {
      setPendingId(null)
    },
  })

  const handleApprove = (id: number) => {
    if (confirm('Are you sure you want to approve this application? This will create a candidate record.')) {
      reviewMutation.mutate({ id, action: 'APPROVE' })
    }
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

  const isLoading = loadingElection || loadingApplications

  if (isLoading) {
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

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <div className={pageHeaderBlockClass}>
          <PageHeader
            title="Application Review"
            description={`Review pending applications for: ${ongoingElection.name}`}
            action={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Input
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="w-full sm:w-56 lg:w-64"
                />
                {positions && positions.length > 0 ? (
                  <div className="w-full sm:w-56 lg:w-64">
                    <Select
                      value={selectedPosition}
                      onValueChange={(value) => {
                        setSelectedPosition(value)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
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
            }
          />
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.secondary}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={activeStatusTab}
            onValueChange={(value) => {
              setActiveStatusTab(value)
              setPage(1)
            }}
            className="w-full lg:w-auto"
          >
            <TabsList className="grid w-full grid-cols-3 sm:w-[360px]">
              <TabsTrigger value="PENDING_REVIEW">Pending</TabsTrigger>
              <TabsTrigger value="APPROVED">Approved</TabsTrigger>
              <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs
            value={activeYearTab}
            onValueChange={(value) => {
              setActiveYearTab(value)
              setPage(1)
            }}
            className="w-full lg:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 sm:w-48">
              <TabsTrigger value="2nd Year">2nd Year</TabsTrigger>
              <TabsTrigger value="3rd Year">3rd Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.tertiary}>
        <Card className={dataTableShellClass}>
          <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
            {!applications.length ? (
              <EmptyState
                icon={CheckCircle2}
                title={activeStatusTab === 'PENDING_REVIEW' ? 'All caught up!' : 'No applications'}
                description={`There are no ${activeStatusTab.toLowerCase().replace('_', ' ')} applications right now.`}
              />
            ) : (
              <ApplicationReviewGroups
                groups={applicationGroups}
                activeStatusTab={activeStatusTab}
                pendingId={pendingId}
                onApprove={handleApprove}
                onReject={openReject}
              />
            )}
            {totalPages > 1 ? (
              <DataTablePagination
                className="px-0"
                page={page}
                pageSize={APPLICATIONS_PAGE_SIZE}
                totalCount={totalCount}
                hasPrevious={canGoPrevious}
                hasNext={canGoNext}
                itemLabel="applications"
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
              />
            ) : null}
          </CardContent>
        </Card>
      </Stagger>

      <Dialog open={!!rejectingApp} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectingApp?.full_name}'s application for {rejectingApp?.position_name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onRejectSubmit)(e)} className="space-y-4">
            <FormField label="Rejection Reason" htmlFor="rejection_reason" error={errors.rejection_reason?.message} required>
              <Input id="rejection_reason" placeholder="e.g. Invalid document, does not meet academic year requirement" {...register('rejection_reason')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRejectDialog}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting || reviewMutation.isPending}>
                {reviewMutation.isPending ? 'Rejecting...' : 'Reject Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
