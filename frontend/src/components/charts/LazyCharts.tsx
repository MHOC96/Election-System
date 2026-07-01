import { lazy, Suspense, type ComponentProps } from 'react'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'

const PositionTurnoutBarChartLazy = lazy(() =>
  import('@/components/charts/PositionTurnoutBarChart').then((m) => ({
    default: m.PositionTurnoutBarChart,
  })),
)

const ParticipationDonutChartLazy = lazy(() =>
  import('@/components/charts/ParticipationDonutChart').then((m) => ({
    default: m.ParticipationDonutChart,
  })),
)

const CandidateVotesDonutChartLazy = lazy(() =>
  import('@/components/charts/CandidateVotesDonutChart').then((m) => ({
    default: m.CandidateVotesDonutChart,
  })),
)

type BarChartProps = ComponentProps<typeof PositionTurnoutBarChartLazy>
type ParticipationProps = ComponentProps<typeof ParticipationDonutChartLazy>
type CandidateDonutProps = ComponentProps<typeof CandidateVotesDonutChartLazy>

export function LazyPositionTurnoutBarChart(props: BarChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton variant="bar" className={props.className} />}>
      <PositionTurnoutBarChartLazy {...props} />
    </Suspense>
  )
}

export function LazyParticipationDonutChart(props: ParticipationProps) {
  return (
    <Suspense fallback={<ChartSkeleton variant="donut" />}>
      <ParticipationDonutChartLazy {...props} />
    </Suspense>
  )
}

export function LazyCandidateVotesDonutChart(props: CandidateDonutProps) {
  return (
    <Suspense fallback={<ChartSkeleton variant="donut" />}>
      <CandidateVotesDonutChartLazy {...props} />
    </Suspense>
  )
}
