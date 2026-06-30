import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, CheckCircle2, TrendingUp, Users, Vote } from 'lucide-react'
import { fetchDashboardSummary } from '@/api/dashboard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPercent } from '@/lib/utils'

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  index,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-destructive">Failed to load dashboard.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Election overview and turnout metrics</p>
        </div>
        {data.election && (
          <Badge variant={data.election.status === 'ACTIVE' ? 'success' : 'secondary'}>
            {data.election.name} — {data.election.status}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Members" value={data.total_members} icon={Users} index={0} />
        <StatCard title="Candidates" value={data.total_candidates} icon={Activity} index={1} />
        <StatCard title="Positions" value={data.total_positions} icon={Vote} index={2} />
        <StatCard
          title="Votes Cast"
          value={data.votes_cast}
          description={`${formatPercent(data.turnout_percentage)} avg turnout`}
          icon={TrendingUp}
          index={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Participation</CardTitle>
            <CardDescription>Member voting completion status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Full ballot completed</span>
                <span className="font-medium">{formatPercent(data.full_ballot_completion_percentage)}</span>
              </div>
              <Progress value={data.full_ballot_completion_percentage} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
                <p className="text-lg font-bold">{data.members_completed_ballot}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <Activity className="mx-auto mb-1 h-5 w-5 text-amber-500" />
                <p className="text-lg font-bold">{data.members_partial_ballot}</p>
                <p className="text-xs text-muted-foreground">Partial</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-lg font-bold">{data.members_no_votes}</p>
                <p className="text-xs text-muted-foreground">No votes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Position Turnout</CardTitle>
            <CardDescription>Votes per executive position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.position_turnout.length === 0 ? (
              <p className="text-sm text-muted-foreground">No position data available.</p>
            ) : (
              data.position_turnout.map((item) => (
                <div key={item.position_id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.position_name}</span>
                    <span>
                      {item.votes_cast} / {data.total_members} ({formatPercent(item.turnout_percentage)})
                    </span>
                  </div>
                  <Progress value={item.turnout_percentage} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
