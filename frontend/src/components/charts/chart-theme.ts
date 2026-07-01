import { chartColors } from '@/lib/design-tokens'

/** Shared Recharts styling using design tokens */
export const chartAxisTick = {
  fill: 'hsl(var(--muted-foreground))',
  fontSize: 12,
  fontWeight: 500,
}

export const chartGridStroke = 'hsl(var(--border))'

export const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
  boxShadow: '0 4px 12px hsl(222 47% 11% / 0.08)',
}

export const chartAnimation = {
  duration: 600,
  easing: 'ease-out' as const,
}

export const participationSegmentColors = [
  { key: 'completed', label: 'Completed', color: 'hsl(var(--success))' },
  { key: 'partial', label: 'Partial', color: 'hsl(var(--warning))' },
  { key: 'none', label: 'No votes', color: 'hsl(var(--muted-foreground) / 0.55)' },
] as const

export function getChartColor(index: number): string {
  return chartColors[index % chartColors.length]
}

export const chartLegendStyle = {
  fontSize: 12,
  color: 'hsl(var(--muted-foreground))',
}
