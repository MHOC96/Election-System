import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import { createPosition, deletePosition, fetchPositions, updatePosition } from '@/api/positions'
import { getApiErrorMessage } from '@/api/client'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/design-system/FormField'
import { pageLayoutClass } from '@/lib/design-tokens'
import { positionSchema, type PositionForm } from '@/lib/form-schemas'
import type { Position } from '@/types/api'
import { toast } from 'sonner'

export function PositionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PositionForm>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: '' },
  })

  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  })

  const saveMutation = useMutation({
    mutationFn: (values: PositionForm) => {
      if (editing) return updatePosition(editing.id, values.name)
      return createPosition(values.name)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['positions'] })
      toast.success(editing ? 'Position updated' : 'Position created')
      closeDialog()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['positions'] })
      toast.success('Position deleted')
      setDeleteTarget(null)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '' })
    setDialogOpen(true)
  }

  const openEdit = (position: Position) => {
    setEditing(position)
    reset({ name: position.name })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
    reset({ name: '' })
  }

  const onSubmit = (values: PositionForm) => {
    saveMutation.mutate(values)
  }

  return (
    <div className={pageLayoutClass}>
      <PageHeader
        title="Positions"
        description="Manage executive committee positions"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Position
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !positions?.length ? (
            <EmptyState
              icon={ClipboardList}
              title="No positions"
              description="Create positions like President, Secretary, Treasurer."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(position)}
                        aria-label={`Edit ${position.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(position)}
                        aria-label={`Delete ${position.name}`}
                      >
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

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Position' : 'New Position'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField
              label="Position Name"
              htmlFor="position-name"
              error={errors.name?.message}
              required
            >
              <Input id="position-name" placeholder="e.g. President" {...register('name')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete position?"
        description={`This will permanently delete "${deleteTarget?.name}". Positions with candidates or votes cannot be deleted.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
