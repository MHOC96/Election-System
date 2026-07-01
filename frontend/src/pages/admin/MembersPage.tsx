import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Upload, Users } from 'lucide-react'
import { deleteMember, fetchMembers, importMembers, updateMember } from '@/api/members'
import { getApiErrorMessage } from '@/api/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { MemberStatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/design-system/FormField'
import { pageLayoutClass } from '@/lib/design-tokens'
import { memberEditSchema, type MemberEditForm } from '@/lib/form-schemas'
import type { Member } from '@/types/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function MembersPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [editing, setEditing] = useState<Member | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MemberEditForm>({
    resolver: zodResolver(memberEditSchema),
    defaultValues: { cpm_number: '', mc_number: '', is_active: true },
  })

  const isActive = watch('is_active')

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
    mutationFn: ({ id, values }: { id: number; values: MemberEditForm }) =>
      updateMember(id, {
        cpm_number: values.cpm_number.trim().toUpperCase(),
        mc_number: values.mc_number,
        is_active: values.is_active,
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
    reset({
      cpm_number: member.cpm_number,
      mc_number: member.mc_number,
      is_active: member.is_active,
    })
  }

  const closeEditDialog = () => {
    setEditing(null)
    reset({ cpm_number: '', mc_number: '', is_active: true })
  }

  const onSubmit = (values: MemberEditForm) => {
    if (!editing) return
    updateMutation.mutate({ id: editing.id, values })
  }

  return (
    <div className={pageLayoutClass}>
      <PageHeader
        title="Members"
        description="Import and manage voting members"
        action={
          <>
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
          </>
        }
      />

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
                  <p className="font-medium text-warning">Duplicates</p>
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

      <DataTable
        isLoading={isLoading}
        isEmpty={!isLoading && !data?.results.length}
        emptyIcon={Users}
        emptyTitle="No members yet"
        emptyDescription="Import a CSV or XLSX file with CPM and MC numbers to get started."
        pagination={
          data
            ? {
                page,
                totalCount: data.count,
                hasPrevious: !!data.previous,
                hasNext: !!data.next,
                onPrevious: () => setPage((p) => Math.max(1, p - 1)),
                onNext: () => setPage((p) => p + 1),
                itemLabel: 'members',
              }
            : undefined
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CPM Number</TableHead>
              <TableHead>MC Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.cpm_number}</TableCell>
                <TableCell>{member.mc_number || '—'}</TableCell>
                <TableCell>
                  <MemberStatusBadge isActive={member.is_active} />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap sm:table-cell">
                  {formatDate(member.created_at)}
                </TableCell>
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
      </DataTable>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField
              label="CPM Number"
              htmlFor="cpm_number"
              error={errors.cpm_number?.message}
              required
            >
              <Input id="cpm_number" {...register('cpm_number')} />
            </FormField>
            <FormField
              label="MC Number"
              htmlFor="mc_number"
              error={errors.mc_number?.message}
              hint="Updating the MC number also updates the member's login password."
              required
            >
              <Input id="mc_number" type="password" {...register('mc_number')} />
            </FormField>
            <FormField label="Status">
              <Select
                value={isActive ? 'active' : 'inactive'}
                onValueChange={(value) => setValue('is_active', value === 'active', { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove member?"
        description={`Remove ${deleteTarget?.cpm_number}? Members who have already voted cannot be removed.`}
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
