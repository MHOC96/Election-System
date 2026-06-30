import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { fetchAuditLogs } from '@/api/audit'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils'

export function AuditPage() {
  const [page, setPage] = useState(1)
  const [actionInput, setActionInput] = useState('')
  const [action, setAction] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAction(actionInput.trim().toUpperCase())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [actionInput])

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action],
    queryFn: () =>
      fetchAuditLogs({
        page,
        ...(action ? { action } : {}),
      }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-muted-foreground">Immutable record of all system actions</p>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Filter by action (e.g. LOGIN)"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !data?.results.length ? (
            <EmptyState icon={Shield} title="No audit logs" description="Actions will appear here as they occur." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                      <TableCell>{log.actor_cpm_number ?? '—'}</TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{log.action}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.ip_address ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t p-4">
                <p className="text-sm text-muted-foreground">{data.count} total logs</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
