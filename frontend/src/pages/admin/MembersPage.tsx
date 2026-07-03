import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { AlertTriangle, Pencil, Trash2, Users } from 'lucide-react'
import {
  clearAllMembers,
  fetchMemberDeletionStatus,
  fetchMembers,
  importMembers,
  updateMember,
} from '@/api/members'
import { getApiErrorMessage } from '@/api/client'
import { MemberImportPanel } from '@/components/members/MemberImportPanel'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass } from '@/lib/design-tokens'
import { memberEditSchema, type MemberEditForm } from '@/lib/form-schemas'
import { fetchAndSetQueryData, markQueriesStale, refreshDashboard } from '@/lib/query-sync'
import type { Member, MemberImportResult, Paginated } from '@/types/api'
import { toast } from 'sonner'

function emptyMembersPage(): Paginated<Member> {
  return { count: 0, results: [], next: null, previous: null }
}

function applyMembersClear(queryClient: QueryClient) {
  queryClient.setQueriesData<Paginated<Member>>({ queryKey: ['members'] }, (old) =>
    old ? { ...old, count: 0, results: [], next: null, previous: null } : emptyMembersPage(),
  )
}

async function refreshMembersPage(queryClient: QueryClient, page = 1) {
  return fetchAndSetQueryData(queryClient, ['members', page], () => fetchMembers(page))
}

export function MembersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [importResult, setImportResult] = useState<MemberImportResult | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<MemberEditForm>({
    resolver: zodResolver(memberEditSchema),
    defaultValues: { cpm_number: '', mc_number: '', is_active: true },
    mode: 'onBlur',
  })

  const cpmNumber = watch('cpm_number')
  const mcNumber = watch('mc_number')
  const isActive = watch('is_active')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['members', page],
    queryFn: () => fetchMembers(page),
  })

  const { data: deletionStatus, isLoading: deletionStatusLoading } = useQuery({
    queryKey: ['members-deletion-status'],
    queryFn: fetchMemberDeletionStatus,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const canClearMembers = deletionStatus?.allowed === true
  const showDeletionBlockedNotice =
    !deletionStatusLoading && deletionStatus !== undefined && !deletionStatus.allowed
  const totalMembers = data?.count ?? 0

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await importMembers(file)
      await refreshMembersPage(queryClient, 1)
      markQueriesStale(queryClient, ['members'])
      return result
    },
    onSuccess: (result) => {
      setPage(1)
      refreshDashboard(queryClient)
      setImportResult(result)

      if (result.failed_rows.length === 0 && result.duplicates.length === 0) {
        toast.success(`Imported ${result.successful} member${result.successful === 1 ? '' : 's'}`)
      } else {
        toast.warning('Import completed with some rows skipped — review the summary below.')
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const clearAllMutation = useMutation({
    mutationFn: clearAllMembers,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['members'] })
      applyMembersClear(queryClient)
      setClearAllOpen(false)
      setPage(1)
    },
    onSuccess: async (result) => {
      markQueriesStale(queryClient, ['members'])
      await refreshMembersPage(queryClient, 1)
      refreshDashboard(queryClient)
      if (result.deleted === 0) {
        toast.info('No members to remove')
      } else {
        toast.success(`Removed all ${result.deleted} member${result.deleted === 1 ? '' : 's'}`)
      }
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.error(getApiErrorMessage(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: MemberEditForm }) =>
      updateMember(id, {
        cpm_number: values.cpm_number.trim().toUpperCase(),
        mc_number: values.mc_number,
        is_active: values.is_active,
      }),
    onSuccess: async () => {
      await refreshMembersPage(queryClient, page)
      toast.success('Member updated')
      closeEditDialog()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const tableLoading = isLoading && !data
  const tableRefreshing =
    isFetching && !!data && !importMutation.isPending && !clearAllMutation.isPending

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

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Members"
          description="Import and manage voting members"
          action={
            canClearMembers && totalMembers > 0 ? (
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setClearAllOpen(true)}
                disabled={clearAllMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Clear all members
              </Button>
            ) : null
          }
        />
      </Stagger>

      {showDeletionBlockedNotice ? (
        <Stagger delayMs={sectionDelays.primary}>
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Clearing members is disabled while an election is active or paused. Close the
                current election to remove all members.
              </p>
            </CardContent>
          </Card>
        </Stagger>
      ) : null}

      <Stagger delayMs={showDeletionBlockedNotice ? sectionDelays.secondary : sectionDelays.primary}>
        <MemberImportPanel
          onImport={(file) => importMutation.mutate(file)}
          isImporting={importMutation.isPending}
          result={importResult}
          onDismiss={() => setImportResult(null)}
        />
      </Stagger>

      <Stagger delayMs={showDeletionBlockedNotice ? sectionDelays.tertiary : sectionDelays.secondary}>
        <DataTable
        isLoading={tableLoading}
        isRefreshing={tableRefreshing}
        isEmpty={!tableLoading && !data?.results.length}
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((member) => (
              <TableRow key={member.id}>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>
      </Stagger>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
            <FormField
              label="CPM Number"
              htmlFor="cpm_number"
              error={errors.cpm_number?.message}
              valid={Boolean(touchedFields.cpm_number && cpmNumber && !errors.cpm_number)}
              required
            >
              <Input
                id="cpm_number"
                autoComplete="off"
                autoCapitalize="characters"
                {...register('cpm_number')}
              />
            </FormField>
            <FormField
              label="MC Number"
              htmlFor="mc_number"
              error={errors.mc_number?.message}
              valid={Boolean(touchedFields.mc_number && mcNumber && !errors.mc_number)}
              hint="Updating the MC number also updates the member's login password."
              required
            >
              <Input id="mc_number" type="password" autoComplete="new-password" {...register('mc_number')} />
            </FormField>
            <FormField label="Status" htmlFor="member_status" hint="Inactive members cannot sign in or vote.">
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
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={clearAllOpen}
        title="Clear all members?"
        description={`This permanently removes all ${totalMembers.toLocaleString()} member(s) and their vote records. This cannot be undone.`}
        confirmLabel="Clear all members"
        destructive
        loading={clearAllMutation.isPending}
        onCancel={() => setClearAllOpen(false)}
        onConfirm={() => clearAllMutation.mutate()}
      />
    </div>
  )
}
