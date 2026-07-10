import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, ExternalLink, Clock, FileText } from 'lucide-react'
import { getApiErrorMessage } from '@/api/client'
import { fetchOngoingElection } from '@/api/elections'
import { fetchAllApplications, reviewApplication, type CandidateApplication } from '@/api/applications'
import { fetchPositions } from '@/api/positions'
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
  const [selectedPosition, setSelectedPosition] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('3rd Year')
  
  const { data: ongoingElection, isLoading: loadingElection } = useQuery({
    queryKey: ['elections', 'ongoing'],
    queryFn: fetchOngoingElection,
  })

  const reviewOpen =
    ongoingElection?.current_phase === 'REVIEWING' ||
    ongoingElection?.current_phase === 'READY_FOR_VOTING'

  const { data: applications, isLoading: loadingApplications } = useQuery({
    queryKey: ['applications', 'all', ongoingElection?.id],
    queryFn: () => fetchAllApplications({ status: 'PENDING_REVIEW' }),
    enabled: !!ongoingElection && reviewOpen,
  })

  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  })

  const filteredApplications = applications?.filter((app) => {
    const matchesPosition = selectedPosition === 'all' || app.position_name === selectedPosition
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      app.full_name.toLowerCase().includes(searchLower) ||
      app.cpm_number.toLowerCase().includes(searchLower) ||
      app.mc_number.toLowerCase().includes(searchLower)
    const matchesYear = app.member_academic_year === activeTab
    return matchesPosition && matchesSearch && matchesYear
  })

  const groupedApplications = filteredApplications?.reduce((acc, app) => {
    if (!acc[app.position_name]) acc[app.position_name] = []
    acc[app.position_name].push(app)
    return acc
  }, {} as Record<string, CandidateApplication[]>) || {}

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
    onSuccess: (_, variables) => {
      notifySuccess(`Application ${variables.action.toLowerCase()}d successfully`)
      void queryClient.invalidateQueries({ queryKey: ['applications', 'all'] })
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      if (variables.action === 'REJECT') {
        closeRejectDialog()
      }
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
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
          {applications && applications.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Input 
                placeholder="Search applications..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64"
              />
              {positions && positions.length > 0 && (
                <div className="w-full sm:w-64">
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6 w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="3rd Year">3rd Year</TabsTrigger>
            <TabsTrigger value="2nd Year">2nd Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </Stagger>

      <Stagger delayMs={sectionDelays.tertiary}>
        <Card>
          <CardContent className="p-4 sm:p-6">
            {!applications?.length ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up!"
                description="There are no pending applications to review right now."
              />
            ) : !filteredApplications?.length ? (
              <EmptyState
                icon={CheckCircle2}
                title="No matching applications"
                description={`There are no pending applications matching your search or selected position.`}
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
                          <h3 className="font-semibold text-lg">{positionName}</h3>
                          <Badge variant="outline">{apps.length}</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Candidate Name</TableHead>
                              <TableHead>MC / CPM Number</TableHead>
                              <TableHead>Declaration</TableHead>
                              <TableHead className="w-32 text-right">Actions</TableHead>
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
                                        className="h-10 w-10 rounded-full object-cover border"
                                      />
                                    )}
                                    <span>{app.full_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div>MC: {app.mc_number}</div>
                                    <div className="text-muted-foreground">CPM: {app.cpm_number}</div>
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
                                <TableCell className="text-right whitespace-nowrap">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleApprove(app.id)}
                                    disabled={reviewMutation.isPending}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => openReject(app)}
                                    disabled={reviewMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                )})}
              </div>
            )}
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
