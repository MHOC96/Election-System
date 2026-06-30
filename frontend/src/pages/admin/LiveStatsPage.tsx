import { fetchLiveStats } from '@/api/dashboard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function LiveStatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-live'],
    queryFn: () => fetchLiveStats(),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!data?.election) {
    return (
      <div>
        <PageHeader title="Live statistics" description="Real-time vote counts (refreshes every 8 seconds)" />
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No active election. Start an election to see live stats.
          </CardContent>
        </Card>
      </div>
    )
  }

  const positionChart = data.positions.map((p) => ({
    name: p.position_name,
    votes: p.total_votes,
  }))

  const topCandidates = [...data.candidates]
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 6)

  return (
    <div>
      <PageHeader
        title="Live statistics"
        description={`${data.election.name} — polling every 8 seconds`}
        action={<Badge variant="success">{data.election.status}</Badge>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total votes</p>
            <p className="text-2xl font-bold">{data.total_votes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Positions</p>
            <p className="text-2xl font-bold">{data.positions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Leading candidate</p>
            <p className="text-lg font-bold">{data.highest_voted_overall?.full_name ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Votes per position</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positionChart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top candidates</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topCandidates}
                  dataKey="vote_count"
                  nameKey="full_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {topCandidates.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {data.positions.map((position) => (
          <Card key={position.position_id}>
            <CardHeader>
              <CardTitle className="text-base">{position.position_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {position.rankings.map((rank) => (
                <div key={rank.candidate_id} className="flex items-center justify-between text-sm">
                  <span>
                    #{rank.rank} {rank.full_name}
                  </span>
                  <span className="font-medium">
                    {rank.vote_count} ({rank.vote_percentage}%)
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
