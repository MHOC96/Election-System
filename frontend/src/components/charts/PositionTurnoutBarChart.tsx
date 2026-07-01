import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { chartAnimation, chartAxisTick, chartGridStroke } from '@/components/charts/chart-theme'
import { cn } from '@/lib/utils'

export interface TurnoutBarDatum {
  name: string
  votes: number
  percentage?: number
}

interface PositionTurnoutBarChartProps {
  data: TurnoutBarDatum[]
  ariaSummary?: string
  className?: string
}

function truncateLabel(value: string, max = 14): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function PositionTurnoutBarChart({ data, ariaSummary, className }: PositionTurnoutBarChartProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      {ariaSummary ? <p className="sr-only">{ariaSummary}</p> : null}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 4 }} barCategoryGap="20%">
          <defs>
            <linearGradient id="turnoutBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartGridStroke} strokeDasharray="4 4" vertical={false} strokeOpacity={0.6} />
          <XAxis
            dataKey="name"
            tick={chartAxisTick}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={(value: string) => truncateLabel(value)}
            height={48}
          />
          <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.35)', radius: 6 }}
            content={
              <ChartTooltip
                formatter={(value, _name, item) => {
                  const count = value ?? 0
                  const pct = (item.payload as TurnoutBarDatum | undefined)?.percentage
                  return pct !== undefined
                    ? `${count.toLocaleString()} votes · ${pct.toFixed(1)}% turnout`
                    : `${count.toLocaleString()} votes`
                }}
              />
            }
          />
          <Bar
            dataKey="votes"
            fill="url(#turnoutBarGradient)"
            radius={[8, 8, 0, 0]}
            maxBarSize={56}
            animationDuration={chartAnimation.duration}
            animationEasing={chartAnimation.easing}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill="url(#turnoutBarGradient)" />
            ))}
            <LabelList
              dataKey="votes"
              position="top"
              className="fill-muted-foreground text-[11px] font-medium"
              formatter={(value: unknown) => {
                const num = typeof value === 'number' ? value : Number(value ?? 0)
                return num > 0 ? num.toLocaleString() : ''
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
