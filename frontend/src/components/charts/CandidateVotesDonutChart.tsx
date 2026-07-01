import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { chartAnimation, chartLegendStyle, getChartColor } from '@/components/charts/chart-theme'

export interface CandidateVoteDatum {
  full_name: string
  vote_count: number
}

interface CandidateVotesDonutChartProps {
  data: CandidateVoteDatum[]
  ariaSummary?: string
}

function truncateName(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export function CandidateVotesDonutChart({ data, ariaSummary }: CandidateVotesDonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.vote_count, 0)

  if (total === 0) {
    return null
  }

  return (
    <>
      {ariaSummary ? <p className="sr-only">{ariaSummary}</p> : null}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="vote_count"
            nameKey="full_name"
            cx="50%"
            cy="46%"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
            stroke="hsl(var(--card))"
            strokeWidth={2}
            animationDuration={chartAnimation.duration}
            animationEasing={chartAnimation.easing}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={getChartColor(index)} />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(label) => label}
                formatter={(value) => {
                  const count = value ?? 0
                  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
                  return `${count.toLocaleString()} votes · ${pct}%`
                }}
              />
            }
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={chartLegendStyle}
            formatter={(value) => {
              const item = data.find((d) => d.full_name === value)
              const count = item?.vote_count ?? 0
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0'
              return (
                <span className="text-sm text-muted-foreground">
                  {truncateName(String(value))}{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {count} ({pct}%)
                  </span>
                </span>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  )
}
