import { cn, formatDate } from '@/lib/utils'

interface VotingScheduleDetailsProps {
  votingStartAt?: string | null
  votingEndAt?: string | null
  className?: string
}

export function VotingScheduleDetails({
  votingStartAt,
  votingEndAt,
  className,
}: VotingScheduleDetailsProps) {
  if (!votingStartAt && !votingEndAt) return null

  const rows: Array<{ label: string; value: string }> = []
  if (votingStartAt) rows.push({ label: 'Opens', value: formatDate(votingStartAt) })
  if (votingEndAt) rows.push({ label: 'Closes', value: formatDate(votingEndAt) })

  return (
    <dl
      className={cn(
        'flex flex-col items-center gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2',
        className,
      )}
    >
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-baseline justify-center gap-x-1.5">
          <dt className="portal-subtle font-semibold">{row.label}</dt>
          <dd className="portal-body">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
