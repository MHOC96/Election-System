import { Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CountdownDisplay } from '@/components/shared/CountdownDisplay'
import { CountdownTimeInline } from '@/components/shared/CountdownTimeCard'
import { electionCountdownCardClass } from '@/lib/design-tokens'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ApplicationsStartsSoonCardProps {
  electionName: string
  targetAt: string | null
  className?: string
}

/** Compact member card while applications are scheduled but not yet open. */
export function ApplicationsStartsSoonCard({
  electionName,
  targetAt,
  className,
}: ApplicationsStartsSoonCardProps) {
  return (
    <Card
      className={cn(
        electionCountdownCardClass,
        'election-countdown--applications-upcoming',
        className,
      )}
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full blur-3xl sm:h-44 sm:w-44"
        style={{ background: 'var(--cd-glow-a)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-32 rounded-full blur-3xl sm:h-40 sm:w-40"
        style={{ background: 'var(--cd-glow-b)' }}
        aria-hidden="true"
      />

      <CardContent className="relative px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center sm:gap-5">
          <div className="space-y-2">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm sm:h-14 sm:w-14"
              style={{
                background: 'var(--cd-chip-bg)',
                borderColor: 'var(--cd-chip-border)',
                color: 'var(--cd-chip-text)',
              }}
            >
              <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
              Candidate applications
            </p>
            <h2
              className="text-lg font-bold tracking-tight sm:text-xl"
              style={{ color: 'var(--cd-title, inherit)' }}
            >
              Applications opening soon
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{electionName}</p>
            {targetAt ? (
              <p className="text-sm font-medium text-foreground/80">
                Opens · {formatDate(targetAt)}
              </p>
            ) : null}
          </div>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            When the countdown ends, you can apply for one position. Have your photo and declaration PDF
            ready.
          </p>

          <CountdownTimeInline ariaLabel="Time until applications open" className="w-full pt-1">
            <CountdownDisplay targetAt={targetAt} label="Time until applications open" centered />
          </CountdownTimeInline>
        </div>
      </CardContent>
    </Card>
  )
}
