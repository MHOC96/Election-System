import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchRecentAuditLogs } from '@/api/audit'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { scheduleIdle } from '@/lib/prefetch'
import { formatDate } from '@/lib/utils'

export function RecentActivityFeed() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    scheduleIdle(() => setEnabled(true))
  }, [])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => fetchRecentAuditLogs(5),
    staleTime: 30_000,
    enabled,
  })

  const logs = data ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest system events from the audit log</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/audit">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!enabled || isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Unable to load recent activity.</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {log.actor_cpm_number ?? 'System'} · {formatDate(log.created_at)}
                  </p>
                </div>
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
