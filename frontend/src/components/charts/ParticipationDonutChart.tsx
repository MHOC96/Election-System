import { useMemo, useState } from 'react'
import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { chartAnimation, participationSegmentColors } from '@/components/charts/chart-theme'

interface ParticipationDonutChartProps {
  completed: number
  partial: number
  none: number
  ariaSummary?: string
}

type SegmentKey = 'completed' | 'partial' | 'none'

const SEGMENT_META: Record<
  SegmentKey,
  { label: string; gradientId: string; color: string }
> = {
  completed: {
    label: participationSegmentColors[0].label,
    gradientId: 'participation-completed',
    color: participationSegmentColors[0].color,
  },
  partial: {
    label: participationSegmentColors[1].label,
    gradientId: 'participation-partial',
    color: participationSegmentColors[1].color,
  },
  none: {
    label: participationSegmentColors[2].label,
    gradientId: 'participation-none',
    color: participationSegmentColors[2].color,
  },
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
      <tspan x={cx} y={cy - 6} fill="hsl(var(--foreground))" fontSize={24} fontWeight={700}>
        {total.toLocaleString()}
      </tspan>
      <tspan x={cx} y={cy + 16} fill="hsl(var(--muted-foreground))" fontSize={12} fontWeight={500}>
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
  const total = completed + partial + none
  const [hoveredKey, setHoveredKey] = useState<SegmentKey | undefined>(undefined)

  const chartData = useMemo(
    () =>
      (['completed', 'partial', 'none'] as const)
        .map((key) => ({
          key,
          name: SEGMENT_META[key].label,
          value: key === 'completed' ? completed : key === 'partial' ? partial : none,
          gradientId: SEGMENT_META[key].gradientId,
          color: SEGMENT_META[key].color,
        }))
        .filter((item) => item.value > 0),
    [completed, partial, none],
  )

  if (total === 0) {
    return null
  }

  return (
    <div className="flex h-full w-full flex-col">
      {ariaSummary ? <p className="sr-only">{ariaSummary}</p> : null}

      <div className="relative h-full min-h-0 w-full flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-8 rounded-full bg-gradient-to-br from-primary/[0.07] via-transparent to-success/[0.06] blur-2xl"
        />
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id="participation-completed" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success))" />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" />
              </linearGradient>
              <linearGradient id="participation-partial" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--warning))" />
                <stop offset="100%" stopColor="hsl(var(--chart-4))" />
              </linearGradient>
              <linearGradient id="participation-none" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground) / 0.42)" />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground) / 0.22)" />
              </linearGradient>
            </defs>

            <Pie
              data={[{ value: total }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="78%"
              stroke="none"
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            >
              <Cell fill="hsl(var(--muted) / 0.45)" />
            </Pie>

            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="78%"
              paddingAngle={3}
              cornerRadius={5}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              animationDuration={chartAnimation.duration}
              animationEasing={chartAnimation.easing}
              onMouseEnter={(_, index) => setHoveredKey(chartData[index]?.key)}
              onMouseLeave={() => setHoveredKey(undefined)}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={`url(#${entry.gradientId})`}
                  opacity={hoveredKey && hoveredKey !== entry.key ? 0.4 : 1}
                />
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
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
