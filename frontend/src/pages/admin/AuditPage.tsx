import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { Shield } from 'lucide-react'

import { fetchAuditLogs } from '@/api/audit'

import { AuditLogDetailSheet } from '@/components/audit/AuditLogDetailSheet'

import {

  AuditLogFilters,

  type AuditLogFilterValues,

} from '@/components/audit/AuditLogFilters'

import { AuditLogMobileList } from '@/components/audit/AuditLogMobileList'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { DataTable } from '@/components/shared/DataTable'

import { AuditActionBadge } from '@/components/shared/StatusBadge'

import { PageHeader } from '@/components/shared/PageHeader'

import { toDateRangeParams } from '@/lib/audit-actions'

import { pageLayoutClass } from '@/lib/design-tokens'

import { cn, formatDate } from '@/lib/utils'



const EMPTY_FILTERS: AuditLogFilterValues = {

  action: '',

  actorCpm: '',

  fromDate: '',

  toDate: '',

}



export function AuditPage() {

  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState<AuditLogFilterValues>(EMPTY_FILTERS)

  const [debouncedActorCpm, setDebouncedActorCpm] = useState('')

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)



  useEffect(() => {

    const timer = window.setTimeout(() => {

      setDebouncedActorCpm(filters.actorCpm.trim().toUpperCase())

      setPage(1)

    }, 400)

    return () => window.clearTimeout(timer)

  }, [filters.actorCpm])



  const queryParams = useMemo(

    () => ({

      page,

      ...(filters.action ? { action: filters.action } : {}),

      ...(debouncedActorCpm ? { actor_cpm: debouncedActorCpm } : {}),

      ...toDateRangeParams(filters.fromDate, filters.toDate),

    }),

    [page, filters.action, filters.fromDate, filters.toDate, debouncedActorCpm],

  )



  const { data, isLoading } = useQuery({

    queryKey: ['audit-logs', queryParams],

    queryFn: () => fetchAuditLogs(queryParams),

  })



  const hasFilters =

    filters.action !== '' ||

    debouncedActorCpm !== '' ||

    filters.fromDate !== '' ||

    filters.toDate !== ''



  function handleFiltersChange(next: AuditLogFilterValues) {

    setFilters(next)

    setPage(1)

  }



  function openLogDetail(logId: number) {

    setSelectedLogId(logId)

    setDetailOpen(true)

  }



  return (

    <div className={pageLayoutClass}>

      <PageHeader

        title="Audit Logs"

        description="Immutable record of all system actions. Select a row to view full metadata."

      />



      <AuditLogFilters values={filters} onChange={handleFiltersChange} />



      <DataTable

        isLoading={isLoading}

        isEmpty={!isLoading && !data?.results.length}

        emptyIcon={Shield}

        emptyTitle="No audit logs"

        emptyDescription={

          hasFilters

            ? 'No logs match the current filters. Try adjusting or clearing them.'

            : 'Actions will appear here as they occur.'

        }

        mobileView={

          data?.results.length ? (

            <AuditLogMobileList logs={data.results} onSelectLog={openLogDetail} />

          ) : undefined

        }

        pagination={

          data

            ? {

                page,

                totalCount: data.count,

                hasPrevious: !!data.previous,

                hasNext: !!data.next,

                onPrevious: () => setPage((p) => p - 1),

                onNext: () => setPage((p) => p + 1),

                itemLabel: 'logs',

              }

            : undefined

        }

      >

        <Table>

          <TableHeader>

            <TableRow>

              <TableHead>Time</TableHead>

              <TableHead>Actor</TableHead>

              <TableHead>Action</TableHead>

              <TableHead className="hidden sm:table-cell">IP</TableHead>

            </TableRow>

          </TableHeader>

          <TableBody>

            {data?.results.map((log) => (

              <TableRow

                key={log.id}

                className={cn('cursor-pointer transition-colors hover:bg-muted/50')}

                onClick={() => openLogDetail(log.id)}

                onKeyDown={(event) => {

                  if (event.key === 'Enter' || event.key === ' ') {

                    event.preventDefault()

                    openLogDetail(log.id)

                  }

                }}

                tabIndex={0}

                role="button"

                aria-label={`View audit log ${log.action} by ${log.actor_cpm_number ?? 'unknown actor'}`}

              >

                <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>

                <TableCell>{log.actor_cpm_number ?? '—'}</TableCell>

                <TableCell>

                  <AuditActionBadge action={log.action} />

                </TableCell>

                <TableCell className="hidden text-muted-foreground sm:table-cell">

                  {log.ip_address ?? '—'}

                </TableCell>

              </TableRow>

            ))}

          </TableBody>

        </Table>

      </DataTable>



      <AuditLogDetailSheet

        logId={selectedLogId}

        open={detailOpen}

        onOpenChange={setDetailOpen}

      />

    </div>

  )

}

