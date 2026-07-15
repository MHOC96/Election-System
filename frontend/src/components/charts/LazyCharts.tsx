import { lazy, Suspense, type ComponentProps } from 'react'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'

const ParticipationDonutChartLazy = lazy(() =>
  import('@/components/charts/ParticipationDonutChart').then((m) => ({
    default: m.ParticipationDonutChart,
  })),
)

type ParticipationProps = ComponentProps<typeof ParticipationDonutChartLazy>

export function LazyParticipationDonutChart(props: ParticipationProps) {
  return (
    <Suspense fallback={<ChartSkeleton variant="donut" />}>
      <ParticipationDonutChartLazy {...props} />
    </Suspense>
  )
}
