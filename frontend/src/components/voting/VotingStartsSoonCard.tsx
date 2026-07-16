import { Vote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CountdownDisplay } from '@/components/shared/CountdownDisplay'
import { memberCardSurfaceClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface VotingStartsSoonCardProps {
  electionName: string
  targetAt: string | null
  className?: string
}

/** Compact member card — countdown only until voting opens (no review timeline or extra copy). */
export function VotingStartsSoonCard({ electionName, targetAt, className }: VotingStartsSoonCardProps) {
  return (
    <Card
      className={cn(
        memberCardSurfaceClass,
        'election-countdown election-countdown--voting-upcoming relative overflow-hidden',
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

      <CardContent className="relative p-5 sm:p-6 md:p-8">
        <div className="mx-auto flex w-full max-w-md flex-col items-stretch gap-5 sm:max-w-lg sm:gap-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm sm:h-14 sm:w-14"
              style={{
                background: 'var(--cd-chip-bg)',
                borderColor: 'var(--cd-chip-border)',
                color: 'var(--cd-chip-text)',
              }}
            >
              <Vote className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h2
                className="text-lg font-bold tracking-tight sm:text-xl"
                style={{ color: 'var(--cd-title, inherit)' }}
              >
                Voting starts in
              </h2>
              <p className="truncate text-sm text-muted-foreground">{electionName}</p>
            </div>
          </div>

          <div className="w-full rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-5">
            <CountdownDisplay targetAt={targetAt} label="Time remaining" centered />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
