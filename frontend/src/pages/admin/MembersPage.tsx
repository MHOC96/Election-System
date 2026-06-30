import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Upload, Users } from 'lucide-react'
import { deleteMember, fetchMembers, importMembers, updateMember } from '@/api/members'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { Member } from '@/types/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function MembersPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [editing, setEditing] = useState<Member | null>(null)
  const [cpmNumber, setCpmNumber] = useState('')
  const [mcNumber, setMcNumber] = useState('')
  const [isActive, setIsActive] = useState(true)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['members', page],
    queryFn: () => fetchMembers(page),
  })

  const importMutation = useMutation({
    mutationFn: importMembers,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success(`Imported ${result.successful} of ${result.total_rows} members`)
      if (result.failed_rows.length || result.duplicates.length) {
        toast.warning(
          `${result.failed_rows.length} failed, ${result.duplicates.length} duplicates`,
        )
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('Member removed')
      setDeleteTarget(null)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMember(editing!.id, {
        cpm_number: cpmNumber.trim().toUpperCase(),
        mc_number: mcNumber,
        is_active: isActive,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('Member updated')
      closeEditDialog()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    e.target.value = ''
  }

  const openEdit = (member: Member) => {
    setEditing(member)
    setCpmNumber(member.cpm_number)
    setMcNumber(member.mc_number)
    setIsActive(member.is_active)
  }

  const closeEditDialog = () => {
    setEditing(null)
    setCpmNumber('')
    setMcNumber('')
    setIsActive(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-muted-foreground">Import and manage voting members</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="h-4 w-4" />
            {importMutation.isPending ? 'Importing...' : 'Import CSV/XLSX'}
          </Button>
        </div>
      </div>

      {importMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Import Result</CardTitle>
            <CardDescription>
              {importMutation.data.successful} successful of {importMutation.data.total_rows} rows
            </CardDescription>
          </CardHeader>
          {(importMutation.data.failed_rows.length > 0 ||
            importMutation.data.duplicates.length > 0) && (
            <CardContent className="space-y-4 text-sm">
              {importMutation.data.failed_rows.length > 0 && (
                <div>
                  <p className="font-medium text-destructive">Failed rows</p>
                  <ul className="mt-1 list-inside list-disc text-muted-foreground">
                    {importMutation.data.failed_rows.slice(0, 5).map((row) => (
                      <li key={`f-${row.row}`}>
                        Row {row.row}: {row.cpm_number} — {row.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {importMutation.data.duplicates.length > 0 && (
                <div>
                  <p className="font-medium text-amber-600">Duplicates</p>
                  <ul className="mt-1 list-inside list-disc text-muted-foreground">
                    {importMutation.data.duplicates.slice(0, 5).map((row) => (
                      <li key={`d-${row.row}`}>
                        Row {row.row}: {row.cpm_number}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.results.length ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Import a CSV or XLSX file with CPM and MC numbers to get started."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPM Number</TableHead>
                    <TableHead>MC Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.cpm_number}</TableCell>
                      <TableCell>{member.mc_number || '—'}</TableCell>
                      <TableCell>{member.is_active ? 'Active' : 'Inactive'}</TableCell>
                      <TableCell>{formatDate(member.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(member)}
                          aria-label={`Edit ${member.cpm_number}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(member)}
                          aria-label={`Remove ${member.cpm_number}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t p-4">
                <p className="text-sm text-muted-foreground">{data.count} total members</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.previous}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.next}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="cpm_number">CPM Number</Label>
              <Input
                id="cpm_number"
                value={cpmNumber}
                onChange={(e) => setCpmNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc_number">MC Number</Label>
              <Input
                id="mc_number"
                type="password"
                value={mcNumber}
                onChange={(e) => setMcNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={isActive ? 'active' : 'inactive'}
                onValueChange={(value) => setIsActive(value === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {deleteTarget?.cpm_number}? Members who have already voted cannot be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
