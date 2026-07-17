import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Trash2, Users } from 'lucide-react'
import {
  clearAllMembers,
  fetchMemberDeletionStatus,
  fetchMembers,
  importMembers,
  MEMBERS_PAGE_SIZE,
  resetMemberPassword,
  updateMember,
} from '@/api/members'
import { notifyApiError, notifyInfo, notifySuccessMessage, notifyWarning } from '@/lib/notify'
import { SUCCESS_MESSAGES } from '@/lib/user-messages'
import { MemberImportPanel } from '@/components/members/MemberImportPanel'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { getPaginationMeta } from '@/components/shared/DataTablePagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { pageLayoutClass, pageHeaderBlockClass } from '@/lib/design-tokens'
import { PageNotice } from '@/components/shared/PageNotice'
import { memberEditSchema, type MemberEditForm } from '@/lib/form-schemas'
import {
  fetchAndSetQueryData,
  markQueriesStale,
  MEMBERS_STALE_MS,
  refreshDashboard,
} from '@/lib/query-sync'
import type { AcademicYear, Member, MemberImportResult } from '@/types/api'


async function refreshMembersPage(queryClient: QueryClient, academicYear: AcademicYear, page = 1) {
  return fetchAndSetQueryData(queryClient, ['members', academicYear, page], () => fetchMembers(academicYear, page))
}

export function MembersPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<AcademicYear>('2nd Year')
  const [page, setPage] = useState(1)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [resetTarget, setResetTarget] = useState<Member | null>(null)
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
    defaultValues: { cpm_number: '', is_active: true },
    mode: 'onBlur',
  })

  const cpmNumber = watch('cpm_number')
  const isActive = watch('is_active')

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['members', activeTab, page],
    queryFn: () => fetchMembers(activeTab, page),
    staleTime: MEMBERS_STALE_MS,
    placeholderData: (previous) => previous,
  })

  const { data: deletionStatus, isLoading: deletionStatusLoading } = useQuery({
    queryKey: ['members-deletion-status'],
    queryFn: fetchMemberDeletionStatus,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const showDeletionBlockedNotice =
    !deletionStatusLoading && deletionStatus !== undefined && !deletionStatus.allowed
  const totalMembers = data?.count ?? 0

  const importMutation = useMutation({
    mutationFn: (file: File) => importMembers(file, activeTab),
    onSuccess: (result) => {
      setPage(1)
      void refreshMembersPage(queryClient, activeTab, 1)
      markQueriesStale(queryClient, ['members'])
      refreshDashboard(queryClient)
      setImportResult(result)

      if (result.failed_rows.length > 0 || result.duplicates.length > 0) {
        notifyWarning(
          'Import finished with issues',
          'Some rows were skipped. Review the import summary below for details.',
        )
      }
    },
    onError: (error) => notifyApiError(error, 'import'),
  })

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllMembers(activeTab),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['members', activeTab] })
      setClearAllOpen(false)
      setPage(1)
    },
    onSuccess: (result) => {
      if (result.deleted === 0) {
        notifyInfo('Nothing to remove', 'There are no member records to delete right now.')
      }

      markQueriesStale(queryClient, ['members', activeTab])
      void refreshMembersPage(queryClient, activeTab, 1)
      refreshDashboard(queryClient)
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: ['members', activeTab] })
      notifyApiError(error, 'import')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: MemberEditForm }) =>
      updateMember(id, {
        cpm_number: values.cpm_number.trim().toUpperCase(),
        is_active: values.is_active,
      }),
    onSuccess: () => {
      closeEditDialog()
      void refreshMembersPage(queryClient, activeTab, page)
    },
    onError: (error) => notifyApiError(error, 'import'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => resetMemberPassword(id),
    onSuccess: (result) => {
      setResetTarget(null)
      notifySuccessMessage(SUCCESS_MESSAGES.memberImport(result.message))
    },
    onError: (error) => notifyApiError(error, 'import'),
  })

  const tableLoading = isPending && !data
  const tableRefreshing =
    isFetching && !!data && !importMutation.isPending && !clearAllMutation.isPending

  if (isError && !data) {
    return (
      <div className={pageLayoutClass}>
        <Stagger delayMs={sectionDelays.header}>
          <PageHeader title="Members" description="Import and manage voting members" />
        </Stagger>
        <Stagger delayMs={sectionDelays.primary}>
          <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
        </Stagger>
      </div>
    )
  }

  const openEdit = (member: Member) => {
    setEditing(member)
    reset({
      cpm_number: member.cpm_number,
      is_active: member.is_active,
    })
  }

  const closeEditDialog = () => {
    setEditing(null)
    reset({ cpm_number: '', is_active: true })
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const onSubmit = (values: MemberEditForm) => {
    if (!editing) return
    updateMutation.mutate({ id: editing.id, values })
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <div className={pageHeaderBlockClass}>
          <PageHeader
            title="Members"
            description="Import and manage voting members"
            action={
              showDeletionBlockedNotice ? null : (
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setClearAllOpen(true)}
                  disabled={
                    clearAllMutation.isPending ||
                    deletionStatusLoading ||
                    isPending ||
                    totalMembers === 0
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sm:hidden">Clear all</span>
                  <span className="hidden sm:inline">Clear all {activeTab} members</span>
                </Button>
              )
            }
          />
          {showDeletionBlockedNotice ? (
            <PageNotice>
              Clearing members is disabled while an election is active or paused. Close the
              current election to remove all members.
            </PageNotice>
          ) : null}
        </div>
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as AcademicYear)
            setPage(1)
            setImportResult(null)
          }}
          className="mb-6 w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="2nd Year">2nd Year</TabsTrigger>
            <TabsTrigger value="3rd Year">3rd Year</TabsTrigger>
          </TabsList>
        </Tabs>

        <MemberImportPanel
          academicYear={activeTab}
          onImport={(file) => importMutation.mutate(file)}
          isImporting={importMutation.isPending}
          result={importResult}
          onDismiss={() => setImportResult(null)}
          className="mb-6"
        />
      </Stagger>

      <Stagger delayMs={sectionDelays.secondary}>
        <DataTable
        isLoading={tableLoading}
        isRefreshing={tableRefreshing}
        isEmpty={!tableLoading && !data?.results.length}
        emptyIcon={Users}
        emptyTitle={`No ${activeTab} members yet`}
        emptyDescription="Import a CSV or XLSX file with CPM and MC numbers to get started."
        mobileView={
          data?.results.length ? (
            <div className="mobile-card-list">
              {data.results.map((member) => (
                <div key={member.id} className="mobile-card-item">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm">{member.cpm_number}</p>
                    <p className="text-xs text-muted-foreground">MC: ••••••••</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setResetTarget(member)}
                      aria-label={`Reset password for ${member.cpm_number}`}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(member)}
                      aria-label={`Edit ${member.cpm_number}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : undefined
        }
        pagination={
          data
            ? (() => {
                const { totalPages } = getPaginationMeta(page, data.count, MEMBERS_PAGE_SIZE)
                return {
                  page,
                  pageSize: MEMBERS_PAGE_SIZE,
                  totalCount: data.count,
                  hasPrevious: !!data.previous,
                  hasNext: !!data.next,
                  onPrevious: () => setPage((p) => Math.max(1, p - 1)),
                  onNext: () => setPage((p) => Math.min(totalPages, p + 1)),
                  itemLabel: 'members',
                }
              })()
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
                <TableCell>••••••••</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setResetTarget(member)}
                      aria-label={`Reset password for ${member.cpm_number}`}
                      title="Reset password"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(member)}
                      aria-label={`Edit ${member.cpm_number}`}
                      title="Edit member"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
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
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                {...register('cpm_number')}
              />
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
        title={`Clear all ${activeTab} members?`}
        description={`This permanently removes all ${activeTab} members and their vote records. This cannot be undone.`}
        confirmLabel={`Clear ${activeTab} members`}
        destructive
        loading={clearAllMutation.isPending}
        onCancel={() => setClearAllOpen(false)}
        onConfirm={() => clearAllMutation.mutate()}
      />

      <ConfirmDialog
        open={!!resetTarget}
        title={`Reset password for ${resetTarget?.cpm_number ?? 'member'}?`}
        description="Their login password will be restored to their original imported MC number. The member must change it again after signing in. Share the MC number with them outside the system."
        confirmLabel="Reset password"
        loading={resetPasswordMutation.isPending}
        onCancel={() => setResetTarget(null)}
        onConfirm={() => {
          if (resetTarget) resetPasswordMutation.mutate(resetTarget.id)
        }}
      />
    </div>
  )
}
