import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2, UserCheck } from 'lucide-react'
import {
  createCandidate,
  deleteCandidate,
  fetchCandidates,
  updateCandidate,
  uploadCandidatePhoto,
} from '@/api/candidates'
import { fetchPositions } from '@/api/positions'
import { getApiErrorMessage } from '@/api/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import type { AcademicYear, Candidate } from '@/types/api'
import { toast } from 'sonner'

const candidateSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  academic_year: z.enum(['2nd Year', '3rd Year']),
  position: z.number().min(1, 'Position is required'),
  photo_url: z.string().url('Photo URL is required'),
})

type CandidateForm = z.infer<typeof candidateSchema>

export function CandidatesPage() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => fetchCandidates(),
  })

  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  })

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      toast.success(editing ? 'Candidate updated' : 'Candidate created')
      closeDialog()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCandidate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      toast.success('Candidate deleted')
      setDeleteTarget(null)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const openCreate = () => {
    if (!positions?.length) {
      toast.error('Create a position first')
      return
    }
    setEditing(null)
    reset({ full_name: '', academic_year: '2nd Year', position: positions[0].id, photo_url: '' })
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
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadCandidatePhoto(file)
      setValue('photo_url', result.photo_url, { shouldValidate: true })
      toast.success('Photo uploaded')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Candidates</h2>
          <p className="text-muted-foreground">Manage election candidates</p>
        </div>
        <Button onClick={openCreate} disabled={!positions?.length}>
          <Plus className="h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !candidates?.length ? (
            <EmptyState
              icon={UserCheck}
              title="No candidates"
              description="Add candidates for each position. Photos are uploaded to Cloudinary."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <img
                        src={candidate.photo_url}
                        alt={candidate.full_name}
                        loading="lazy"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{candidate.full_name}</TableCell>
                    <TableCell>{candidate.academic_year}</TableCell>
                    <TableCell>{candidate.position_name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(candidate)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(candidate)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Candidate' : 'New Candidate'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => void handleSubmit((data) => saveMutation.mutate(data))(e)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...register('full_name')} />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select
                value={academicYear}
                onValueChange={(v) => setValue('academic_year', v as AcademicYear)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={positionId ? String(positionId) : ''}
                onValueChange={(v) => setValue('position', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.position && <p className="text-sm text-destructive">{errors.position.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handlePhotoUpload(e)} />
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </Button>
                {photoUrl && (
                  <img src={photoUrl} alt="Preview" className="h-12 w-12 rounded-full object-cover" />
                )}
              </div>
              {errors.photo_url && <p className="text-sm text-destructive">{errors.photo_url.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deleteTarget?.full_name}? Candidates with votes cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
