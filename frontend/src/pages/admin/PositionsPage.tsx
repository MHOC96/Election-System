import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import { createPosition, deletePosition, fetchPositions, updatePosition } from '@/api/positions'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Position } from '@/types/api'
import { toast } from 'sonner'

export function PositionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [name, setName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)

  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return updatePosition(editing.id, name)
      return createPosition(name)
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
    setName('')
    setDialogOpen(true)
  }

  const openEdit = (position: Position) => {
    setEditing(position)
    setName(position.name)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
    setName('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Positions</h2>
          <p className="text-muted-foreground">Manage executive committee positions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Position
        </Button>
      </div>

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
                      <Button variant="ghost" size="icon" onClick={() => openEdit(position)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(position)}>
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
            <DialogTitle>{editing ? 'Edit Position' : 'New Position'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="position-name">Position Name</Label>
            <Input
              id="position-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. President"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!name.trim() || saveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete position?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. Positions with candidates or votes cannot be deleted.
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
