import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { getApiErrorMessage } from '@/api/client'
import { fetchDraftElection } from '@/api/elections'
import { fetchPositions } from '@/api/positions'
import { fetchMyApplications, submitApplication, uploadDeclarationForm, type CandidateApplication } from '@/api/applications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { FormField } from '@/components/design-system/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { pageLayoutClass } from '@/lib/design-tokens'
import { notifyError, notifySuccess } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'

const applicationSchema = z.object({
  full_name: z.string().trim().min(1, 'Full Name is required'),
  mc_number: z.string().trim().min(1, 'MC Number is required'),
  cpm_number: z.string().trim().min(1, 'CPM Number is required'),
  contact_number: z.string().trim().min(1, 'Contact Number is required'),
  declaration_file: z.any().refine((val) => val instanceof File, 'Declaration form (PDF) is required'),
  declaration_agreed: z.boolean().refine((val) => val === true, 'You must agree to the declaration'),
})

type ApplicationForm = z.infer<typeof applicationSchema>

export function CandidateApplicationPage() {
  const queryClient = useQueryClient()
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  
  const { data: draftElection, isLoading: loadingElection } = useQuery({
    queryKey: ['elections', 'draft'],
    queryFn: fetchDraftElection,
  })

  const { data: positions, isLoading: loadingPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  })

  const { data: myApplications, isLoading: loadingApplications } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: fetchMyApplications,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  })

  const uploadMutation = useMutation({
    mutationFn: uploadDeclarationForm,
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const submitMutation = useMutation({
    mutationFn: submitApplication,
    onSuccess: () => {
      notifySuccess('Application submitted successfully')
      void queryClient.invalidateQueries({ queryKey: ['applications', 'me'] })
      closeDialog()
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const openApply = (positionId: number) => {
    setSelectedPosition(positionId)
    reset({
      full_name: '',
      mc_number: '',
      cpm_number: '',
      contact_number: '',
      declaration_agreed: undefined,
    })
  }

  const closeDialog = () => {
    setSelectedPosition(null)
    reset()
  }

  const onSubmit = async (values: ApplicationForm) => {
    if (!selectedPosition) return
    
    // First upload the document
    const uploadRes = await uploadMutation.mutateAsync(values.declaration_file)
    if (!uploadRes.document_url) {
      notifyError('Failed to upload document')
      return
    }

    // Then submit application
    submitMutation.mutate({
      position: selectedPosition,
      full_name: values.full_name,
      mc_number: values.mc_number,
      cpm_number: values.cpm_number,
      contact_number: values.contact_number,
      declaration_file: uploadRes.document_url,
    })
  }

  const getApplicationForPosition = (positionId: number) => {
    if (!myApplications) return null
    // Get the most recent non-withdrawn application
    return myApplications.find((app) => app.position === positionId)
  }

  const isLoading = loadingElection || loadingPositions || loadingApplications

  if (isLoading) {
    return (
      <div className={pageLayoutClass}>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!draftElection) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Candidate Application" description="Apply for executive committee positions" />
        <EmptyState
          icon={Clock}
          title="No open applications"
          description="There are currently no elections open for candidate applications."
        />
      </div>
    )
  }

  const StatusBadge = ({ status, reason }: { status: CandidateApplication['status'], reason?: string }) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>
      case 'APPROVED':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Approved</Badge>
      case 'REJECTED':
        return (
          <div className="flex flex-col items-end gap-1">
            <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>
            {reason && <span className="text-xs text-muted-foreground">{reason}</span>}
          </div>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Candidate Application"
          description={`Apply for positions in: ${draftElection.name}`}
        />
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {positions?.map((position) => {
            const application = getApplicationForPosition(position.id)
            
            return (
              <Card key={position.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{position.name}</CardTitle>
                  <CardDescription>
                    {position.academic_year ? `Requires: ${position.academic_year}` : 'Open to all years'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {application ? (
                    <div className="flex flex-col items-start gap-2">
                      <Label className="text-muted-foreground">My Application Status:</Label>
                      <StatusBadge status={application.status} reason={application.rejection_reason} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You haven't applied for this position.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  {!application || application.status === 'REJECTED' ? (
                    <Button onClick={() => openApply(position.id)} className="w-full">
                      Apply Now
                    </Button>
                  ) : (
                    <Button disabled variant="secondary" className="w-full">
                      Application Submitted
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </Stagger>

      <Dialog open={!!selectedPosition} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Position</DialogTitle>
            <DialogDescription>
              {positions?.find(p => p.id === selectedPosition)?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField label="Full Name" htmlFor="full_name" error={errors.full_name?.message} required>
              <Input id="full_name" {...register('full_name')} />
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="MC Number" htmlFor="mc_number" error={errors.mc_number?.message} required>
                <Input id="mc_number" {...register('mc_number')} />
              </FormField>
              
              <FormField label="CPM Number" htmlFor="cpm_number" error={errors.cpm_number?.message} required>
                <Input id="cpm_number" {...register('cpm_number')} />
              </FormField>
            </div>
            
            <FormField label="Contact Number" htmlFor="contact_number" error={errors.contact_number?.message} required>
              <Input id="contact_number" {...register('contact_number')} />
            </FormField>
            
            <FormField label="Declaration Form (PDF)" htmlFor="declaration_file" error={errors.declaration_file?.message as string} required>
              <Input 
                id="declaration_file" 
                type="file" 
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setValue('declaration_file', file, { shouldValidate: true })
                  }
                }}
              />
            </FormField>
            
            <div className="flex items-center space-x-2 pt-2">
              <Controller
                control={control}
                name="declaration_agreed"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="declaration_agreed"
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    checked={field.value || false}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <Label htmlFor="declaration_agreed" className="text-sm font-normal">
                I declare that the information provided is true and accurate.
              </Label>
            </div>
            {errors.declaration_agreed?.message && (
              <p className="text-sm text-destructive">{errors.declaration_agreed.message as string}</p>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || uploadMutation.isPending || submitMutation.isPending}>
                {(isSubmitting || uploadMutation.isPending || submitMutation.isPending) ? 'Submitting...' : 'Submit Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
