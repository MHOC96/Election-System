import { useMemo, useRef, useState } from 'react'

import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AlertTriangle, Pencil, Trash2, Upload, Users } from 'lucide-react'

import {

  bulkDeleteMembers,

  deleteMember,

  fetchMemberDeletionStatus,

  fetchMembers,

  importMembers,

  updateMember,

} from '@/api/members'

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
import { NativeSelect } from '@/components/ui/native-select'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

import { DataTable } from '@/components/shared/DataTable'

import { PageHeader } from '@/components/shared/PageHeader'

import { FormField } from '@/components/design-system/FormField'

import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'

import { memberEditSchema, type MemberEditForm } from '@/lib/form-schemas'

import type { Member } from '@/types/api'

import { toast } from 'sonner'



export function MembersPage() {

  const fileRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

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



  const { data: deletionStatus } = useQuery({

    queryKey: ['members-deletion-status'],

    queryFn: fetchMemberDeletionStatus,

    refetchInterval: 30_000,

  })



  const canDeleteMembers = deletionStatus?.allowed ?? false

  const pageMemberIds = useMemo(() => data?.results.map((member) => member.id) ?? [], [data?.results])

  const allPageSelected =

    pageMemberIds.length > 0 && pageMemberIds.every((id) => selectedIds.has(id))

  const somePageSelected = pageMemberIds.some((id) => selectedIds.has(id))



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

      setSelectedIds(new Set())

    },

    onError: (error) => toast.error(getApiErrorMessage(error)),

  })



  const bulkDeleteMutation = useMutation({

    mutationFn: bulkDeleteMembers,

    onSuccess: (result) => {

      void queryClient.invalidateQueries({ queryKey: ['members'] })

      setBulkDeleteOpen(false)

      setSelectedIds(new Set())

      if (result.deleted > 0) {

        toast.success(`Removed ${result.deleted} member${result.deleted === 1 ? '' : 's'}`)

      }

      if (result.failed.length > 0) {

        toast.warning(`${result.failed.length} member(s) could not be removed`)

      }

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

    requestAnimationFrame(() => restoreBodyPointerEvents())

  }



  const onSubmit = (values: MemberEditForm) => {

    if (!editing) return

    updateMutation.mutate({ id: editing.id, values })

  }



  const toggleMember = (id: number) => {

    setSelectedIds((current) => {

      const next = new Set(current)

      if (next.has(id)) next.delete(id)

      else next.add(id)

      return next

    })

  }



  const toggleAllOnPage = () => {

    setSelectedIds((current) => {

      const next = new Set(current)

      if (allPageSelected) {

        pageMemberIds.forEach((id) => next.delete(id))

      } else {

        pageMemberIds.forEach((id) => next.add(id))

      }

      return next

    })

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



      {!canDeleteMembers ? (

        <Card className="border-warning/40 bg-warning/5">

          <CardContent className="flex items-start gap-3 py-4">

            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />

            <p className="text-sm text-muted-foreground">

              Member deletion is disabled while an election is active or paused. Close the election

              to remove members.

            </p>

          </CardContent>

        </Card>

      ) : null}



      {selectedIds.size > 0 && canDeleteMembers ? (

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">

          <p className="text-sm font-medium">{selectedIds.size} selected</p>

          <Button

            variant="destructive"

            size="sm"

            onClick={() => setBulkDeleteOpen(true)}

            disabled={bulkDeleteMutation.isPending}

          >

            <Trash2 className="h-4 w-4" />

            Delete selected

          </Button>

        </div>

      ) : null}



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

                onPrevious: () => {

                  setPage((p) => Math.max(1, p - 1))

                  setSelectedIds(new Set())

                },

                onNext: () => {

                  setPage((p) => p + 1)

                  setSelectedIds(new Set())

                },

                itemLabel: 'members',

              }

            : undefined

        }

      >

        <Table>

          <TableHeader>

            <TableRow>

              <TableHead className="w-10">

                <input

                  type="checkbox"

                  className="h-4 w-4 rounded border-input"

                  checked={allPageSelected}

                  ref={(input) => {

                    if (input) input.indeterminate = somePageSelected && !allPageSelected

                  }}

                  onChange={toggleAllOnPage}

                  disabled={!canDeleteMembers || pageMemberIds.length === 0}

                  aria-label="Select all members on this page"

                />

              </TableHead>

              <TableHead>CPM Number</TableHead>

              <TableHead>MC Number</TableHead>

              <TableHead className="text-right">Actions</TableHead>

            </TableRow>

          </TableHeader>

          <TableBody>

            {data?.results.map((member) => (

              <TableRow key={member.id}>

                <TableCell>

                  <input

                    type="checkbox"

                    className="h-4 w-4 rounded border-input"

                    checked={selectedIds.has(member.id)}

                    onChange={() => toggleMember(member.id)}

                    disabled={!canDeleteMembers}

                    aria-label={`Select ${member.cpm_number}`}

                  />

                </TableCell>

                <TableCell className="font-medium">{member.cpm_number}</TableCell>

                <TableCell>{member.mc_number || '—'}</TableCell>

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

                    disabled={!canDeleteMembers}

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

            <FormField label="Status" htmlFor="member_status">

              <NativeSelect
                id="member_status"
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) =>
                  setValue('is_active', e.target.value === 'active', { shouldValidate: true })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>

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

        description={`Remove ${deleteTarget?.cpm_number}? This also removes their vote records for closed elections.`}

        confirmLabel="Remove"

        destructive

        loading={deleteMutation.isPending}

        onCancel={() => setDeleteTarget(null)}

        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}

      />



      <ConfirmDialog

        open={bulkDeleteOpen}

        title={`Remove ${selectedIds.size} member${selectedIds.size === 1 ? '' : 's'}?`}

        description="Selected members and their vote records will be permanently removed."

        confirmLabel="Remove all selected"

        destructive

        loading={bulkDeleteMutation.isPending}

        onCancel={() => setBulkDeleteOpen(false)}

        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}

      />

    </div>

  )

}

