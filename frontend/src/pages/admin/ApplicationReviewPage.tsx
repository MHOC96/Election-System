import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, ExternalLink, Clock, FileText } from 'lucide-react'
import { getApiErrorMessage } from '@/api/client'
import { fetchOngoingElection } from '@/api/elections'
import { fetchPositions } from '@/api/positions'
import { fetchAllApplications, reviewApplication, type CandidateApplication } from '@/api/applications'
import { POSITIONS_QUERY_KEY, POSITIONS_STALE_MS } from '@/lib/query-sync'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FormField } from '@/components/design-system/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { pageLayoutClass } from '@/lib/design-tokens'
import { notifyError, notifySuccess } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const rejectSchema = z.object({
  rejection_reason: z.string().trim().min(1, 'Rejection reason is required'),
})

type RejectForm = z.infer<typeof rejectSchema>

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
      }),
    enabled: !!ongoingElection && reviewOpen,
  })

  const applications = applicationsPage?.results ?? []
  const totalCount = applicationsPage?.count ?? 0
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const groupedApplications = applications.reduce((acc, app) => {
    if (!acc[app.position_name]) acc[app.position_name] = []
    acc[app.position_name].push(app)
    return acc
  }, {} as Record<string, CandidateApplication[]>)

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
      notifySuccess(`Application ${variables.action.toLowerCase()}d successfully`)
      void queryClient.invalidateQueries({ queryKey: ['applications', 'all'] })
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      if (variables.action === 'REJECT') {
        closeRejectDialog()
      }
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <PageHeader
            title="Application Review"
            description={`Review pending applications for: ${ongoingElection.name}`}
          />
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Input 
                placeholder="Search applications..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full sm:w-64"
              />
              {positions && positions.length > 0 && (
                <div className="w-full sm:w-64">
                  <Select value={selectedPosition} onValueChange={(value) => {
                    setSelectedPosition(value)
                    setPage(1)
                  }}>
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
              )}
            </div>
          )}
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.secondary}>
        <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-between">
          <Tabs value={activeStatusTab} onValueChange={(value) => {
            setActiveStatusTab(value)
            setPage(1)
          }} className="w-full sm:w-auto">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-3">
              <TabsTrigger value="PENDING_REVIEW">Pending</TabsTrigger>
              <TabsTrigger value="APPROVED">Approved</TabsTrigger>
              <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={activeYearTab} onValueChange={(value) => {
            setActiveYearTab(value)
            setPage(1)
          }} className="w-full sm:w-auto">
            <TabsList className="grid w-full sm:w-48 grid-cols-2">
              <TabsTrigger value="2nd Year">2nd Year</TabsTrigger>
              <TabsTrigger value="3rd Year">3rd Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.tertiary}>
        <Card>
          <CardContent className="p-4 sm:p-6">
            {!applications.length ? (
              <EmptyState
                icon={CheckCircle2}
                title={activeStatusTab === 'PENDING_REVIEW' ? "All caught up!" : "No applications"}
                description={`There are no ${activeStatusTab.toLowerCase().replace('_', ' ')} applications right now.`}
              />
            ) : (
              <div className="space-y-8">
                {Array.from(new Set((positions || []).map(p => p.name)))
                  .filter(name => groupedApplications[name] && groupedApplications[name].length > 0)
                  .map(positionName => {
                    const apps = groupedApplications[positionName];

                    return (
                      <div key={positionName} className="rounded-md border overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 border-b flex justify-between items-center">
                          <h3 className="font-semibold text-base sm:text-lg">{positionName}</h3>
                          <Badge variant="outline">{apps.length}</Badge>
                        </div>

                        {/* Mobile card view */}
                        <div className="md:hidden">
                          <div className="divide-y">
                            {apps.map((app) => (
                              <div key={app.id} className="px-4 py-3 space-y-3">
                                <div className="flex items-center gap-3">
                                  {app.photo_url && (
                                    <img 
                                      src={app.photo_url} 
                                      alt={app.full_name} 
                                      loading="lazy"
                                      className="h-10 w-10 rounded-full object-cover border shrink-0"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate">{app.full_name}</p>
                                    <p className="text-xs text-muted-foreground">CPM: {app.cpm_number}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button variant="link" size="sm" asChild className="px-0 h-auto">
                                    <a href={app.declaration_file} target="_blank" rel="noopener noreferrer">
                                      <FileText className="w-3.5 h-3.5 mr-1" />
                                      Declaration <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  </Button>
                                  {activeStatusTab === 'PENDING_REVIEW' && (
                                    <div className="ml-auto flex gap-1.5">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                                        onClick={() => handleApprove(app.id)}
                                        disabled={pendingId === app.id}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                        onClick={() => openReject(app)}
                                        disabled={pendingId === app.id}
                                      >
                                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                      </Button>
                                    </div>
                                  )}
                                  {activeStatusTab === 'REJECTED' && (
                                    <span className="text-xs text-destructive">{app.rejection_reason}</span>
                                  )}
                                  {activeStatusTab === 'APPROVED' && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-auto">Approved</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Desktop table view */}
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Candidate Name</TableHead>
                                <TableHead>CPM Number</TableHead>
                                <TableHead>Declaration</TableHead>
                                {activeStatusTab === 'PENDING_REVIEW' && (
                                  <TableHead className="w-32 text-right">Actions</TableHead>
                                )}
                                {activeStatusTab === 'REJECTED' && (
                                  <TableHead>Reason</TableHead>
                                )}
                                {activeStatusTab === 'APPROVED' && (
                                  <TableHead className="text-right">Status</TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {apps.map((app) => (
                                <TableRow key={app.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                      {app.photo_url && (
                                        <img 
                                          src={app.photo_url} 
                                          alt={app.full_name} 
                                          loading="lazy"
                                          className="h-10 w-10 rounded-full object-cover border"
                                        />
                                      )}
                                      <span>{app.full_name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm text-muted-foreground">
                                      CPM: {app.cpm_number}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="link" size="sm" asChild className="px-0">
                                      <a href={app.declaration_file} target="_blank" rel="noopener noreferrer">
                                        <FileText className="w-4 h-4 mr-2" />
                                        View Document <ExternalLink className="w-3 h-3 ml-1" />
                                      </a>
                                    </Button>
                                  </TableCell>
                                  {activeStatusTab === 'PENDING_REVIEW' && (
                                    <TableCell className="text-right whitespace-nowrap">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleApprove(app.id)}
                                        disabled={pendingId === app.id}
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => openReject(app)}
                                        disabled={pendingId === app.id}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" /> Reject
                                      </Button>
                                    </TableCell>
                                  )}
                                  {activeStatusTab === 'REJECTED' && (
                                    <TableCell>
                                      <span className="text-sm text-destructive">{app.rejection_reason}</span>
                                    </TableCell>
                                  )}
                                  {activeStatusTab === 'APPROVED' && (
                                    <TableCell className="text-right">
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                )})}
              </div>
            )}
            {totalPages > 1 ? (
              <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} · {totalCount} applications
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
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
