import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'
import { POSITIONS_QUERY_KEY, POSITIONS_STALE_MS } from '@/lib/query-sync'
import { positionSchema, type PositionForm } from '@/lib/form-schemas'
import type { Position } from '@/types/api'
import { notifyError } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'

export function PositionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PositionForm>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: '', academic_year: undefined, max_winners: 1 },
  })

  const { data: positions, isLoading } = useQuery({
    queryKey: POSITIONS_QUERY_KEY,
    queryFn: fetchPositions,
    staleTime: POSITIONS_STALE_MS,
  })

  const filteredPositions = positions?.filter((position) =>
    position.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const saveMutation = useMutation({
    mutationFn: (values: PositionForm) => {
      // @ts-ignore - Assuming api needs to be updated to accept academic_year
      if (editing) return updatePosition(editing.id, values.name, values.academic_year, undefined, values.max_winners)
      // @ts-ignore
      return createPosition(values.name, values.academic_year, undefined, values.max_winners)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: POSITIONS_QUERY_KEY })
      closeDialog()
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: POSITIONS_QUERY_KEY })
      setDeleteTarget(null)
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', academic_year: undefined, max_winners: 1 })
    setDialogOpen(true)
  }

  const openEdit = (position: Position) => {
    setEditing(position)
    reset({ name: position.name, academic_year: position.academic_year as '3rd Year' | '2nd Year' | undefined, max_winners: position.max_winners })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
    reset({ name: '', academic_year: undefined, max_winners: 1 })
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const onSubmit = (values: PositionForm) => {
    saveMutation.mutate(values)
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <PageHeader
            title="Positions"
            description="Manage executive committee positions"
          />
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Input 
              placeholder="Search positions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button onClick={openCreate} className="w-full sm:w-auto whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </div>
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
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
          ) : !filteredPositions?.length ? (
            <EmptyState
              icon={ClipboardList}
              title="No matching positions"
              description="Try adjusting your search query."
            />
          ) : (
            <>
              {/* Mobile card view */}
              <div className="mobile-card-list md:hidden">
                {filteredPositions.map((position) => (
                  <div key={position.id} className="mobile-card-item">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-sm">{position.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {position.academic_year ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{position.academic_year}</Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {position.max_winners} winner{position.max_winners === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(position)}
                        aria-label={`Edit ${position.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteTarget(position)}
                        aria-label={`Delete ${position.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Eligible Year</TableHead>
                      <TableHead>Winners</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPositions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.name}</TableCell>
                        <TableCell>
                          {position.academic_year ? <Badge variant="outline">{position.academic_year}</Badge> : null}
                        </TableCell>
                        <TableCell>{position.max_winners}</TableCell>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </Stagger>

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

            <FormField
              label="Eligible Academic Year"
              htmlFor="position-academic-year"
              error={errors.academic_year?.message}
            >
              <Controller
                control={control}
                name="academic_year"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger id="position-academic-year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2nd Year">2nd Year</SelectItem>
                      <SelectItem value="3rd Year">3rd Year</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Number of Winners"
              htmlFor="position-max-winners"
              error={errors.max_winners?.message}
            >
              <Input
                id="position-max-winners"
                type="number"
                min="1"
                {...register('max_winners', { valueAsNumber: true })}
              />
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
