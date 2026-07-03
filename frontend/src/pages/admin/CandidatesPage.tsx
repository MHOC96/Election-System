import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Plus, Trash2, UserCheck } from 'lucide-react'
import {
  clearAllCandidates,
  createCandidate,
  deleteCandidate,
  fetchCandidates,
  updateCandidate,
  uploadCandidatePhoto,
} from '@/api/candidates'
import { fetchMemberDeletionStatus } from '@/api/members'
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
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { candidateSchema, type CandidateForm } from '@/lib/form-schemas'
import { markQueriesStale } from '@/lib/query-sync'
import { readFileAsObjectUrl } from '@/lib/image-crop'
import type { AcademicYear, Candidate } from '@/types/api'
import { toast } from 'sonner'

export function CandidatesPage() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  const { data: candidates, isLoading: candidatesLoading, isFetching } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => fetchCandidates(),
  })

  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  })

  const { data: deletionStatus, isLoading: deletionStatusLoading } = useQuery({
    queryKey: ['members-deletion-status'],
    queryFn: fetchMemberDeletionStatus,
    refetchInterval: 30_000,
    staleTime: 0,
  })

  const canClearCandidates = deletionStatus?.allowed === true
  const showDeletionBlockedNotice =
    !deletionStatusLoading && deletionStatus !== undefined && !deletionStatus.allowed
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
    defaultValues: { academic_year: '2nd Year', photo_url: '' },
  })

  const photoUrl = watch('photo_url')
  const academicYear = watch('academic_year')
  const positionId = watch('position')

  const saveMutation = useMutation({
    mutationFn: (data: CandidateForm) => {
      if (editing) return updateCandidate(editing.id, data)
      return createCandidate(data)
    },
    onSuccess: (saved) => {
      syncCandidateInCache(saved)
      markQueriesStale(queryClient, ['dashboard-overview'])
      toast.success(editing ? 'Candidate updated' : 'Candidate created')
      closeDialog()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
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
      markQueriesStale(queryClient, ['dashboard-overview'])
      toast.success('Candidate deleted')
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['candidates'], context.previous)
      }
      toast.error(getApiErrorMessage(error))
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
      markQueriesStale(queryClient, ['dashboard-overview'])
      if (result.deleted === 0 && result.skipped.length === 0) {
        toast.info('No candidates to remove')
      } else if (result.skipped.length > 0) {
        toast.warning(
          `Removed ${result.deleted} candidate${result.deleted === 1 ? '' : 's'}. ${result.skipped.length} skipped because they have votes.`,
        )
      } else {
        toast.success(
          `Removed all ${result.deleted} candidate${result.deleted === 1 ? '' : 's'}`,
        )
      }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['candidates'], context.previous)
      }
      toast.error(getApiErrorMessage(error))
    },
  })

  const openCreate = (preferredPositionId?: number) => {
    if (!positions?.length) {
      toast.error('Create a position first')
      return
    }
    setEditing(null)
    reset({
      full_name: '',
      academic_year: '2nd Year',
      position: preferredPositionId ?? positions[0].id,
      photo_url: '',
    })
    setDialogOpen(true)
  }

  const openEdit = (candidate: Candidate) => {
    setEditing(candidate)
    reset({
      full_name: candidate.full_name,
      academic_year: candidate.academic_year,
      position: candidate.position,
      photo_url: candidate.photo_url,
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
      toast.error('Please choose an image file')
      return
    }
    try {
      const objectUrl = await readFileAsObjectUrl(file)
      setCropImageSrc(objectUrl)
    } catch {
      toast.error('Could not read the selected image')
    }
  }

  const handleCroppedPhotoUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await uploadCandidatePhoto(file)
      setValue('photo_url', result.photo_url, { shouldValidate: true })
      toast.success('Photo uploaded')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
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

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Candidates"
          description="Candidates grouped by executive position"
          action={
            <>
              {canClearCandidates && totalCandidates > 0 ? (
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setClearAllOpen(true)}
                  disabled={clearAllMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all candidates
                </Button>
              ) : null}
              <Button onClick={() => openCreate()} disabled={!hasPositions}>
                <Plus className="h-4 w-4" />
                Add candidate
              </Button>
            </>
          }
        />
      </Stagger>

      {showDeletionBlockedNotice ? (
        <Stagger delayMs={sectionDelays.primary}>
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Clearing candidates is disabled while an election is active or paused. Close the
                current election to remove all candidates.
              </p>
            </CardContent>
          </Card>
        </Stagger>
      ) : null}

      <Stagger delayMs={showDeletionBlockedNotice ? sectionDelays.secondary : sectionDelays.primary}>
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
