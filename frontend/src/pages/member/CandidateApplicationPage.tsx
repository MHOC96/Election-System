import { useState, useCallback, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { getApiErrorMessage } from '@/api/client'
import { fetchPositions } from '@/api/positions'
import { fetchMyApplications, submitApplication, uploadDeclarationForm, uploadApplicationPhoto } from '@/api/applications'
import { useOngoingElection } from '@/hooks/useOngoingElection'
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
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { pageLayoutClass } from '@/lib/design-tokens'
import { ONGOING_ELECTION_QUERY_KEY, APPLICATIONS_STALE_MS, POSITIONS_QUERY_KEY, POSITIONS_STALE_MS } from '@/lib/query-sync'
import { notifyError, notifySuccess } from '@/lib/notify'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { PhotoCropDialog } from '@/components/shared/PhotoCropDialog'
import { ElectionCountdownHero } from '@/components/elections/ElectionCountdownHero'
import { CountdownExpiryWatcher } from '@/components/shared/CountdownDisplay'

const applicationSchema = z.object({
  full_name: z.string().trim().min(1, 'Full Name is required'),
  cpm_number: z.string().trim().min(1, 'CPM Number is required'),
  contact_number: z.string().trim().min(1, 'Contact Number is required'),
  photo_file: z.any().refine((val) => val instanceof File, 'Photo (Image) is required'),
  declaration_file: z.any().refine((val) => val instanceof File, 'Declaration form (PDF) is required'),
  declaration_agreed: z.boolean().refine((val) => val === true, 'You must agree to the declaration'),
})

type ApplicationForm = z.infer<typeof applicationSchema>

function buildDefaultFormValues(cpmNumber: string): Partial<ApplicationForm> {
  return {
    full_name: '',
    cpm_number: cpmNumber,
    contact_number: '',
    declaration_agreed: false,
  }
}

export function CandidateApplicationPage() {
  const queryClient = useQueryClient()
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false)
  const submitInFlightRef = useRef(false)
  const { user, isLoading: authLoading, refreshUser } = useAuth()

  const { data: ongoingElection, isLoading: loadingElection, isError: electionError, isFetching: fetchingElection, refetch: refetchElection } = useOngoingElection()

  const { data: positions, isLoading: loadingPositions, isError: positionsError, isFetching: fetchingPositions, refetch: refetchPositions } = useQuery({
    queryKey: POSITIONS_QUERY_KEY,
    queryFn: fetchPositions,
    staleTime: POSITIONS_STALE_MS,
    enabled: Boolean(ongoingElection),
    placeholderData: (previous) => previous,
  })

  const { data: myApplications, isLoading: loadingApplications } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: fetchMyApplications,
    enabled: Boolean(ongoingElection?.id),
    staleTime: APPLICATIONS_STALE_MS,
    placeholderData: (previous) => previous,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: buildDefaultFormValues(user?.cpm_number ?? ''),
  })

  useEffect(() => {
    if (user?.role === 'MEMBER' && !user.mc_number) {
      void refreshUser()
    }
  }, [user, refreshUser])

  useEffect(() => {
    if (!selectedPosition) return
    reset(buildDefaultFormValues(user?.cpm_number ?? ''))
  }, [selectedPosition, user?.cpm_number, reset])

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
    if (submitInFlightRef.current) return
    setSelectedPosition(positionId)
  }

  const closeDialog = () => {
    if (croppedPreview) {
      URL.revokeObjectURL(croppedPreview)
    }
    setSelectedPosition(null)
    setCroppedPreview(null)
    setCropImageSrc(null)
    reset(buildDefaultFormValues(user?.cpm_number ?? ''))
  }

  const onSubmit = async (values: ApplicationForm) => {
    if (!selectedPosition || submitInFlightRef.current) return

    if (!isApplicationsOpen) {
      notifyError('Applications are not currently open.')
      return
    }

    submitInFlightRef.current = true
    setIsSubmittingApplication(true)

    try {
      const [uploadDocRes, uploadPhotoRes] = await Promise.all([
        uploadDeclarationForm(values.declaration_file),
        uploadApplicationPhoto(values.photo_file),
      ])

      if (!uploadDocRes.document_url || !uploadPhotoRes.photo_url) {
        notifyError('Failed to upload files. Please try again.')
        return
      }

      await submitMutation.mutateAsync({
        position: selectedPosition,
        full_name: values.full_name.trim(),
        cpm_number: values.cpm_number.trim(),
        contact_number: values.contact_number.trim(),
        photo_url: uploadPhotoRes.photo_url,
        declaration_file: uploadDocRes.document_url,
      })
    } catch (error) {
      notifyError(getApiErrorMessage(error))
    } finally {
      submitInFlightRef.current = false
      setIsSubmittingApplication(false)
    }
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

  const handleCountdownExpire = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ONGOING_ELECTION_QUERY_KEY })
  }, [queryClient])

  const queryError = electionError || positionsError
  const electionInitialLoad = loadingElection && !ongoingElection

  if (electionInitialLoad) {
    return (
      <div className={pageLayoutClass}>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (queryError) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Candidate Application" description="Apply for executive committee positions" />
        <QueryErrorState
          onRetry={() => {
            if (electionError) void refetchElection()
            if (positionsError) void refetchPositions()
          }}
          isRetrying={fetchingElection || fetchingPositions}
        />
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
  const applicationStatusKnown = !loadingApplications || myApplications !== undefined
  const hasApplied = Boolean(myApplication)
  const canStartApplication = isApplicationsOpen && applicationStatusKnown && !hasApplied && !authLoading

  const positionSkeletonCount = 6

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Candidate Application"
          description={`Apply for positions in: ${ongoingElection.name}`}
        />
        <CountdownExpiryWatcher targetAt={countdownTarget} onExpire={handleCountdownExpire} />
        <ElectionCountdownHero
          variant={isScheduled ? 'applications-upcoming' : 'applications-open'}
          electionName={ongoingElection.name}
          targetAt={isScheduled ? appStart : appEnd}
          className="mb-6 sm:mb-8"
        />
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        {loadingPositions && !positions ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: positionSkeletonCount }, (_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {positions?.map((position) => {
              const isMyPosition = myApplication?.position === position.id
              const isEligibleYear =
                !position.academic_year ||
                (Boolean(user?.academic_year) && position.academic_year === user?.academic_year)
              const canApplyForThisPosition = canStartApplication && isEligibleYear

              let buttonLabel = 'Apply now'
              if (isScheduled) buttonLabel = 'Opens soon'
              else if (!applicationStatusKnown || authLoading) buttonLabel = 'Loading…'
              else if (hasApplied) buttonLabel = 'Already applied'
              else if (!isEligibleYear) buttonLabel = 'Not eligible'

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
                    ) : !isEligibleYear && user?.academic_year ? (
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
                        type="button"
                        onClick={() => openApply(position.id)}
                        className="w-full"
                        disabled={!canApplyForThisPosition}
                        aria-busy={!applicationStatusKnown || authLoading}
                      >
                        {buttonLabel}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </Stagger>

      <Dialog open={!!selectedPosition} onOpenChange={(open) => !open && !isSubmittingApplication && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for Position</DialogTitle>
            <DialogDescription>
              {positions?.find((p) => p.id === selectedPosition)?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField label="Full Name" htmlFor="full_name" error={errors.full_name?.message} required>
              <Input id="full_name" autoComplete="name" disabled={isSubmittingApplication} {...register('full_name')} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-1">
              <FormField label="CPM Number" htmlFor="cpm_number" error={errors.cpm_number?.message} required>
                <Input
                  id="cpm_number"
                  readOnly
                  autoComplete="off"
                  className="bg-muted cursor-not-allowed text-muted-foreground"
                  {...register('cpm_number')}
                />
              </FormField>
            </div>

            <FormField label="Contact Number" htmlFor="contact_number" error={errors.contact_number?.message} required>
              <Input
                id="contact_number"
                type="tel"
                autoComplete="tel"
                disabled={isSubmittingApplication}
                {...register('contact_number')}
              />
            </FormField>

            <FormField label="Candidate Photo" htmlFor="photo_file" error={errors.photo_file?.message as string} required>
              <div className="space-y-3">
                <Input
                  id="photo_file"
                  type="file"
                  accept="image/*"
                  disabled={isSubmittingApplication}
                  className={croppedPreview ? 'text-transparent' : ''}
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
                {croppedPreview ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2">
                    <img src={croppedPreview} alt="Cropped preview" className="h-10 w-10 shrink-0 rounded-full border object-cover" />
                    <span className="min-w-0 flex-1 text-sm font-medium">Photo cropped and ready</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      disabled={isSubmittingApplication}
                      onClick={() => document.getElementById('photo_file')?.click()}
                    >
                      Change
                    </Button>
                  </div>
                ) : null}
              </div>
            </FormField>

            <FormField label="Declaration Form (PDF)" htmlFor="declaration_file" error={errors.declaration_file?.message as string} required>
              <Input
                id="declaration_file"
                type="file"
                accept="application/pdf"
                disabled={isSubmittingApplication}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setValue('declaration_file', file, { shouldValidate: true })
                  }
                }}
              />
            </FormField>

            <div className="flex items-start space-x-2.5 pt-2">
              <Controller
                control={control}
                name="declaration_agreed"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="declaration_agreed"
                    disabled={isSubmittingApplication}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-ring"
                    checked={field.value || false}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <Label htmlFor="declaration_agreed" className="text-sm font-normal leading-snug">
                I declare that the information provided is true and accurate.
              </Label>
            </div>
            {errors.declaration_agreed?.message ? (
              <p className="text-sm text-destructive">{errors.declaration_agreed.message as string}</p>
            ) : null}

            <DialogFooter className="flex-col-reverse gap-2 pt-4 sm:flex-row">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeDialog} disabled={isSubmittingApplication}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingApplication} aria-busy={isSubmittingApplication}>
                {isSubmittingApplication ? 'Submitting…' : 'Submit Application'}
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
          setCropImageSrc(null)
        }}
      />
    </div>
  )
}
