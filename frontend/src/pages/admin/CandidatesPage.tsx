import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, UserCheck } from 'lucide-react'
import {
  clearAllCandidates,
  createCandidate,
  deleteCandidate,
  fetchCandidates,
  fetchModificationStatus,
  updateCandidate,
  uploadCandidatePhoto,
  uploadCandidateDeclaration,
} from '@/api/candidates'
import { fetchPositions } from '@/api/positions'
import { getApiErrorMessage } from '@/api/client'
import {
  buildPositionCandidateGroups,
  CandidatePositionGroups,
} from '@/components/candidates/CandidatePositionGroups'
import { PhotoCropDialog } from '@/components/shared/PhotoCropDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass, pageHeaderBlockClass } from '@/lib/design-tokens'
import { PageNotice } from '@/components/shared/PageNotice'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { candidateSchema, type CandidateForm } from '@/lib/form-schemas'
import { markQueriesStale, refreshDashboard, POSITIONS_QUERY_KEY, POSITIONS_STALE_MS } from '@/lib/query-sync'
import { readFileAsObjectUrl } from '@/lib/image-crop'
import type { AcademicYear, Candidate } from '@/types/api'
import { notifyError, notifyInfo, notifyWarning } from '@/lib/notify'

export function CandidatesPage() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const declarationRef = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingDeclaration, setUploadingDeclaration] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  const { data: candidates, isLoading: candidatesLoading, isFetching, isError: candidatesError, refetch: refetchCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => fetchCandidates(),
  })

  const { data: positions, isLoading: positionsLoading, isError: positionsError, refetch: refetchPositions } = useQuery({
    queryKey: POSITIONS_QUERY_KEY,
    queryFn: fetchPositions,
    staleTime: POSITIONS_STALE_MS,
  })

  const { data: modificationStatus, isLoading: modificationStatusLoading } = useQuery({
    queryKey: ['candidates-modification-status'],
    queryFn: fetchModificationStatus,
    refetchInterval: 30_000,
    staleTime: 0,
  })

  const canModifyCandidates = modificationStatus?.allowed !== false
  const showElectionLockedNotice =
    !modificationStatusLoading && modificationStatus !== undefined && !canModifyCandidates
  const totalCandidates = candidates?.length ?? 0

  const groupedCandidates = useMemo(() => {
    const groups = buildPositionCandidateGroups(positions, candidates)
    return groups.filter((group) => group.candidates.length > 0)
  }, [positions, candidates])

  const syncCandidateInCache = (saved: Candidate) => {
    queryClient.setQueryData<Candidate[]>(['candidates'], (old) => {
      const list = old ?? []
      const index = list.findIndex((candidate) => candidate.id === saved.id)
      if (index >= 0) {
        const next = [...list]
        next[index] = saved
        return next
      }
      return [...list, saved]
    })
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CandidateForm>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { academic_year: '2nd Year', photo_url: '', declaration_file: '' },
  })

  const photoUrl = watch('photo_url')
  const declarationUrl = watch('declaration_file')
  const academicYear = watch('academic_year')
  const positionId = watch('position')

  const saveMutation = useMutation({
    mutationFn: (data: CandidateForm) => {
      if (editing) return updateCandidate(editing.id, data)
      return createCandidate(data)
    },
    onSuccess: (saved) => {
      syncCandidateInCache(saved)
      markQueriesStale(queryClient, ['candidates'])
      refreshDashboard(queryClient)
      closeDialog()
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCandidate(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['candidates'] })
      const previous = queryClient.getQueryData<Candidate[]>(['candidates'])
      queryClient.setQueryData<Candidate[]>(['candidates'], (old) =>
        (old ?? []).filter((candidate) => candidate.id !== id),
      )
      setDeleteTarget(null)
      return { previous }
    },
    onSuccess: () => {
      markQueriesStale(queryClient, ['candidates'])
      refreshDashboard(queryClient)
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['candidates'], context.previous)
      }
      notifyError(getApiErrorMessage(error))
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: clearAllCandidates,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['candidates'] })
      const previous = queryClient.getQueryData<Candidate[]>(['candidates'])
      queryClient.setQueryData<Candidate[]>(['candidates'], [])
      setClearAllOpen(false)
      return { previous }
    },
    onSuccess: (result) => {
      markQueriesStale(queryClient, ['candidates'])
      refreshDashboard(queryClient)
      if (result.deleted === 0 && result.skipped.length === 0) {
        notifyInfo('No candidates to remove')
      } else if (result.skipped.length > 0) {
        notifyWarning(
          `Removed ${result.deleted} candidate${result.deleted === 1 ? '' : 's'}. ${result.skipped.length} skipped because they have votes.`,
        )
      }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['candidates'], context.previous)
      }
      notifyError(getApiErrorMessage(error))
    },
  })

  const openCreate = (preferredPositionId?: number) => {
    if (!canModifyCandidates) {
      notifyError('Candidates cannot be changed while an election is active or paused.')
      return
    }
    if (!positions?.length) {
      notifyError('Create a position first')
      return
    }
    setEditing(null)
    reset({
      full_name: '',
      academic_year: '2nd Year',
      position: preferredPositionId ?? positions[0].id,
      photo_url: '',
      declaration_file: '',
    })
    setDialogOpen(true)
  }

  const openEdit = (candidate: Candidate) => {
    if (!canModifyCandidates) {
      notifyError('Candidates cannot be changed while an election is active or paused.')
      return
    }
    setEditing(candidate)
    reset({
      full_name: candidate.full_name,
      academic_year: candidate.academic_year,
      position: candidate.position,
      photo_url: candidate.photo_url,
      declaration_file: candidate.declaration_file,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notifyError('Please choose an image file')
      return
    }
    try {
      const objectUrl = await readFileAsObjectUrl(file)
      setCropImageSrc(objectUrl)
    } catch {
      notifyError('Could not read the selected image')
    }
  }

  const handleDeclarationSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      notifyError('Please choose a PDF file')
      return
    }
    setUploadingDeclaration(true)
    try {
      const result = await uploadCandidateDeclaration(file)
      setValue('declaration_file', result.document_url, { shouldValidate: true })
    } catch (error) {
      notifyError(getApiErrorMessage(error))
    } finally {
      setUploadingDeclaration(false)
    }
  }

  const handleCroppedPhotoUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await uploadCandidatePhoto(file)
      setValue('photo_url', result.photo_url, { shouldValidate: true })
    } catch (error) {
      notifyError(getApiErrorMessage(error))
      throw error
    } finally {
      setUploading(false)
    }
  }

  const closeCropDialog = () => {
    setCropImageSrc(null)
  }

  const isLoading = candidatesLoading || positionsLoading
  const isRefreshing =
    isFetching &&
    !!candidates &&
    !saveMutation.isPending &&
    !deleteMutation.isPending &&
    !clearAllMutation.isPending
  const hasPositions = (positions?.length ?? 0) > 0
  const queryError = candidatesError || positionsError

  if (queryError && !candidates && !positions) {
    return (
      <div className={pageLayoutClass}>
        <Stagger delayMs={sectionDelays.header}>
          <PageHeader title="Candidates" description="Candidates grouped by executive position" />
        </Stagger>
        <Stagger delayMs={sectionDelays.primary}>
          <QueryErrorState
            onRetry={() => {
              if (candidatesError) void refetchCandidates()
              if (positionsError) void refetchPositions()
            }}
            isRetrying={isFetching}
          />
        </Stagger>
      </div>
    )
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <div className={pageHeaderBlockClass}>
          <PageHeader
            title="Candidates"
            description="Candidates grouped by executive position"
            action={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {canModifyCandidates && totalCandidates > 0 ? (
                  <Button
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setClearAllOpen(true)}
                    disabled={clearAllMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sm:hidden">Clear all</span>
                    <span className="hidden sm:inline">Clear all candidates</span>
                  </Button>
                ) : null}
                <Button onClick={() => openCreate()} disabled={!hasPositions || !canModifyCandidates}>
                  <Plus className="h-4 w-4" />
                  Add candidate
                </Button>
              </div>
            }
          />
          {showElectionLockedNotice ? (
            <PageNotice>
              Candidate changes are locked while an election is active or paused. Close the
              current election to add, edit, or remove candidates.
            </PageNotice>
          ) : null}
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        <Card className={isRefreshing ? 'opacity-80 transition-opacity' : undefined}>
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : !hasPositions ? (
              <EmptyState
                icon={UserCheck}
                title="No positions yet"
                description="Create executive positions first, then add candidates to each group."
              />
            ) : groupedCandidates.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title="No candidates yet"
                description="Add candidates using the button above and assign them to a position."
              />
            ) : (
              <CandidatePositionGroups
                groups={groupedCandidates}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                readOnly={!canModifyCandidates}
              />
            )}
          </CardContent>
        </Card>
      </Stagger>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit candidate' : 'New candidate'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => void handleSubmit((data) => saveMutation.mutate(data))(e)}
            className="space-y-4"
          >
            <FormField label="Full Name" error={errors.full_name?.message} required>
              <Input {...register('full_name')} />
            </FormField>
            <FormField
              label="Academic Year"
              htmlFor="academic_year"
              error={errors.academic_year?.message}
              required
            >
              <NativeSelect
                id="academic_year"
                value={academicYear}
                onChange={(e) =>
                  setValue('academic_year', e.target.value as AcademicYear, { shouldValidate: true })
                }
              >
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
              </NativeSelect>
            </FormField>
            <FormField
              label="Position"
              htmlFor="position"
              error={errors.position?.message}
              required
            >
              <NativeSelect
                id="position"
                value={positionId ? String(positionId) : String(positions?.[0]?.id ?? '')}
                onChange={(e) =>
                  setValue('position', Number(e.target.value), { shouldValidate: true })
                }
              >
                {positions?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Profile Photo" error={errors.photo_url?.message} required>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handlePhotoSelect(e)}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Choose photo'}
                </Button>
                {photoUrl ? (
                  <img
                    src={optimizeCloudinaryUrl(photoUrl, 96)}
                    alt="Preview"
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : null}
              </div>
            </FormField>
            <FormField
              label="Declaration Form (PDF)"
              error={errors.declaration_file?.message}
              required
              hint="Upload the signed candidate declaration document."
            >
              <input
                ref={declarationRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => void handleDeclarationSelect(e)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => declarationRef.current?.click()}
                  disabled={uploadingDeclaration}
                >
                  {uploadingDeclaration ? 'Uploading…' : declarationUrl ? 'Replace PDF' : 'Upload PDF'}
                </Button>
                {declarationUrl ? (
                  <a
                    href={declarationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View uploaded declaration
                  </a>
                ) : null}
              </div>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PhotoCropDialog
        open={!!cropImageSrc}
        imageSrc={cropImageSrc}
        onCancel={closeCropDialog}
        onConfirm={handleCroppedPhotoUpload}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete candidate?"
        description={`Remove ${deleteTarget?.full_name} from ${deleteTarget?.position_name}? Candidates who have received votes cannot be deleted.`}
        confirmLabel="Delete candidate"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      <ConfirmDialog
        open={clearAllOpen}
        title="Clear all candidates?"
        description={`This permanently removes all ${totalCandidates.toLocaleString()} candidate(s) without votes. Candidates who have received votes will be skipped. This cannot be undone.`}
        confirmLabel="Clear all candidates"
        destructive
        loading={clearAllMutation.isPending}
        onCancel={() => setClearAllOpen(false)}
        onConfirm={() => clearAllMutation.mutate()}
      />
    </div>
  )
}
