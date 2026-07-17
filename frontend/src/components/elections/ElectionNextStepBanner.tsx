import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ElectionNextStep } from '@/lib/election-lifecycle-ui'
import { cn } from '@/lib/utils'

interface ElectionNextStepBannerProps {
  step: ElectionNextStep
  className?: string
}

export function ElectionNextStepBanner({ step, className }: ElectionNextStepBannerProps) {
  const content = (
    <>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">{step.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
      </div>
      {step.href ? (
        <ArrowRight className="h-4 w-4 shrink-0 text-primary opacity-80" aria-hidden="true" />
      ) : null}
    </>
  )

  const classNames = cn(
    'flex w-full min-w-0 flex-col gap-2.5 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-accent/30 px-3.5 py-3.5 sm:flex-row sm:items-start sm:gap-3 sm:px-4 sm:py-3.5',
    step.href && 'transition-colors hover:border-primary/25 hover:bg-primary/8',
    className,
  )

  if (step.href) {
    return (
      <Link to={step.href} className={classNames}>
        {content}
      </Link>
    )
  }

  return <div className={classNames}>{content}</div>
}
