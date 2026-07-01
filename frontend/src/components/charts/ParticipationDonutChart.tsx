import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { chartAnimation, chartLegendStyle, participationSegmentColors } from '@/components/charts/chart-theme'

interface ParticipationDonutChartProps {
  completed: number
  partial: number
  none: number
  ariaSummary?: string
}

function DonutCenterLabel({
  viewBox,
  total,
}: {
  viewBox?: { cx?: number; cy?: number } | null
  total: number
}) {
  const cx = viewBox && 'cx' in viewBox ? viewBox.cx : undefined
  const cy = viewBox && 'cy' in viewBox ? viewBox.cy : undefined
  if (cx === undefined || cy === undefined) return null

  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} y={cy - 6} fill="hsl(var(--foreground))" fontSize={22} fontWeight={600}>
        {total.toLocaleString()}
      </tspan>
      <tspan x={cx} y={cy + 16} fill="hsl(var(--muted-foreground))" fontSize={12}>
        members
      </tspan>
    </text>
  )
}

export function ParticipationDonutChart({
  completed,
  partial,
  none,
  ariaSummary,
}: ParticipationDonutChartProps) {
  const data = [
    { name: participationSegmentColors[0].label, value: completed, color: participationSegmentColors[0].color },
    { name: participationSegmentColors[1].label, value: partial, color: participationSegmentColors[1].color },
    { name: participationSegmentColors[2].label, value: none, color: participationSegmentColors[2].color },
  ].filter((d) => d.value > 0)

  const total = completed + partial + none

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
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="46%"
            innerRadius="58%"
            outerRadius="78%"
            paddingAngle={3}
            stroke="hsl(var(--card))"
            strokeWidth={3}
            animationDuration={chartAnimation.duration}
            animationEasing={chartAnimation.easing}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
            <Label
              content={(props) => (
                <DonutCenterLabel
                  viewBox={props.viewBox as { cx?: number; cy?: number } | undefined}
                  total={total}
                />
              )}
              position="center"
            />
          </Pie>
          <Tooltip
            content={
              <ChartTooltip
                formatter={(value) => {
                  const count = value ?? 0
                  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
                  return `${count.toLocaleString()} · ${pct}%`
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
              const item = data.find((d) => d.name === value)
              const count = item?.value ?? 0
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0'
              return (
                <span className="text-sm text-muted-foreground">
                  {value}{' '}
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
