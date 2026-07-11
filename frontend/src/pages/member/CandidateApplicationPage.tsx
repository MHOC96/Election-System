import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { getApiErrorMessage } from '@/api/client'
import { fetchOngoingElection } from '@/api/elections'
import { fetchPositions } from '@/api/positions'
import { fetchMyApplications, submitApplication, uploadDeclarationForm, uploadApplicationPhoto } from '@/api/applications'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
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
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { PhotoCropDialog } from '@/components/shared/PhotoCropDialog'
import { ElectionCountdownHero } from '@/components/elections/ElectionCountdownHero'
import { useCountdown } from '@/lib/use-countdown'

const applicationSchema = z.object({
  full_name: z.string().trim().min(1, 'Full Name is required'),
  mc_number: z.string().trim().min(1, 'MC Number is required'),
  cpm_number: z.string().trim().min(1, 'CPM Number is required'),
  contact_number: z.string().trim().min(1, 'Contact Number is required'),
  photo_file: z.any().refine((val) => val instanceof File, 'Photo (Image) is required'),
  declaration_file: z.any().refine((val) => val instanceof File, 'Declaration form (PDF) is required'),
  declaration_agreed: z.boolean().refine((val) => val === true, 'You must agree to the declaration'),
})

type ApplicationForm = z.infer<typeof applicationSchema>

export function CandidateApplicationPage() {
  const queryClient = useQueryClient()
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)
  const { user } = useAuth()
  
  const { data: ongoingElection, isLoading: loadingElection } = useQuery({
    queryKey: ['elections', 'ongoing'],
    queryFn: fetchOngoingElection,
    refetchInterval: 15_000,
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

  const uploadPhotoMutation = useMutation({
    mutationFn: uploadApplicationPhoto,
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
      mc_number: user?.mc_number ?? '',
      cpm_number: user?.cpm_number ?? '',
      contact_number: '',
      declaration_agreed: undefined,
    })
  }

  const closeDialog = () => {
    setSelectedPosition(null)
    setCroppedPreview(null)
    reset()
  }

  const onSubmit = async (values: ApplicationForm) => {
    if (!selectedPosition) return
    
    // First upload the document and photo
    const [uploadDocRes, uploadPhotoRes] = await Promise.all([
      uploadMutation.mutateAsync(values.declaration_file),
      uploadPhotoMutation.mutateAsync(values.photo_file)
    ])
    
    if (!uploadDocRes.document_url || !uploadPhotoRes.photo_url) {
      notifyError('Failed to upload files')
      return
    }

    // Then submit application
    submitMutation.mutate({
      position: selectedPosition,
      full_name: values.full_name,
      mc_number: values.mc_number,
      cpm_number: values.cpm_number,
      contact_number: values.contact_number,
      photo_url: uploadPhotoRes.photo_url,
      declaration_file: uploadDocRes.document_url,
    })
  }

  const getMyElectionApplication = () => {
    if (!myApplications || !ongoingElection) return null
    return myApplications.find((app) => app.election === ongoingElection.id) ?? null
  }

  const phase = ongoingElection?.current_phase
  const isScheduled = phase === 'SCHEDULED'
  const isApplicationsOpen = phase === 'APPLICATIONS_OPEN'
  const showApplySection = isScheduled || isApplicationsOpen

  const appStart = ongoingElection?.application_start_at ?? null
  const appEnd = ongoingElection?.application_end_at ?? null
  const countdownTarget = isApplicationsOpen ? appEnd : isScheduled ? appStart : null
  const countdownMs = useCountdown(countdownTarget)

  useEffect(() => {
    if (countdownMs === 0 && countdownTarget) {
      void queryClient.invalidateQueries({ queryKey: ['elections', 'ongoing'] })
    }
  }, [countdownMs, countdownTarget, queryClient])

  const isLoading = loadingElection || loadingPositions || loadingApplications

  if (isLoading) {
    return (
      <div className={pageLayoutClass}>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!ongoingElection || !showApplySection) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Candidate Application" description="Apply for executive committee positions" />
        <EmptyState
          icon={Clock}
          title="Applications are not open"
          description="There are currently no elections accepting candidate applications."
        />
      </div>
    )
  }

  const myApplication = getMyElectionApplication()
  const hasApplied = Boolean(myApplication)
  const canStartApplication = isApplicationsOpen && !hasApplied

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Candidate Application"
          description={`Apply for positions in: ${ongoingElection.name}`}
        />
        <ElectionCountdownHero
          variant={isScheduled ? 'applications-upcoming' : 'applications-open'}
          electionName={ongoingElection.name}
          targetAt={isScheduled ? appStart : appEnd}
          countdownMs={countdownMs}
          className="mb-6 sm:mb-8"
        />
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {positions?.map((position) => {
            const isMyPosition = myApplication?.position === position.id
            const isEligibleYear = !position.academic_year || position.academic_year === user?.academic_year
            const canApplyForThisPosition = canStartApplication && isEligibleYear

            return (
              <Card key={position.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{position.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  {isMyPosition && myApplication ? (
                    <div className="flex flex-col items-start gap-2">
                      <Label className="text-muted-foreground">My application status</Label>
                      <ApplicationStatusBadge
                        status={myApplication.status}
                        reason={myApplication.rejection_reason}
                      />
                    </div>
                  ) : hasApplied ? (
                    <p className="text-sm text-muted-foreground">
                      You already applied for another position in this election.
                    </p>
                  ) : !isEligibleYear ? (
                    <p className="text-sm text-destructive">
                      You are not eligible for this position. It requires {position.academic_year}.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You can apply for one position in this election.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  {isMyPosition && myApplication ? (
                    <Button disabled variant="secondary" className="w-full">
                      Application submitted
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openApply(position.id)}
                      className="w-full"
                      disabled={!canApplyForThisPosition}
                    >
                      {isScheduled 
                        ? 'Opens soon' 
                        : hasApplied 
                          ? 'Already applied' 
                          : !isEligibleYear 
                            ? 'Not eligible' 
                            : 'Apply now'}
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
              <FormField label="MC Number" htmlFor="mc_number" error={errors.mc_number?.message}>
                <Input id="mc_number" readOnly className="bg-muted cursor-not-allowed text-muted-foreground" {...register('mc_number')} />
              </FormField>
              
              <FormField label="CPM Number" htmlFor="cpm_number" error={errors.cpm_number?.message}>
                <Input id="cpm_number" readOnly className="bg-muted cursor-not-allowed text-muted-foreground" {...register('cpm_number')} />
              </FormField>
            </div>
            
            <FormField label="Contact Number" htmlFor="contact_number" error={errors.contact_number?.message} required>
              <Input id="contact_number" {...register('contact_number')} />
            </FormField>
            
            <FormField label="Candidate Photo" htmlFor="photo_file" error={errors.photo_file?.message as string} required>
              <div className="space-y-3">
                <Input 
                  id="photo_file" 
                  type="file" 
                  accept="image/*"
                  className={croppedPreview ? "text-transparent" : ""}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => setCropImageSrc(reader.result as string)
                      reader.readAsDataURL(file)
                      e.target.value = ''
                    }
                  }}
                />
                {croppedPreview && (
                  <div className="flex items-center gap-3 rounded-md border p-2 bg-muted/20">
                    <img src={croppedPreview} alt="Cropped preview" className="w-12 h-12 rounded-full object-cover border" />
                    <span className="text-sm font-medium">Photo cropped and ready</span>
                    <Button type="button" variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => document.getElementById('photo_file')?.click()}>
                      Change
                    </Button>
                  </div>
                )}
              </div>
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
              <Button type="submit" disabled={isSubmitting || uploadMutation.isPending || uploadPhotoMutation.isPending || submitMutation.isPending}>
                {(isSubmitting || uploadMutation.isPending || uploadPhotoMutation.isPending || submitMutation.isPending) ? 'Submitting...' : 'Submit Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <PhotoCropDialog
        open={!!cropImageSrc}
        imageSrc={cropImageSrc}
        onCancel={() => setCropImageSrc(null)}
        onConfirm={async (file) => {
          setValue('photo_file', file, { shouldValidate: true })
          if (croppedPreview) URL.revokeObjectURL(croppedPreview)
          setCroppedPreview(URL.createObjectURL(file))
        }}
      />
    </div>
  )
}
