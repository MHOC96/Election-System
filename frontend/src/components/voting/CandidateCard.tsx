import { memo } from 'react'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { Check } from 'lucide-react'
import type { Candidate } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { memberCardRadiusClass, transitionInteractive } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface CandidateCardProps {
  candidate: Pick<Candidate, 'id' | 'full_name' | 'academic_year' | 'photo_url'>
  isRecorded: boolean
  disabled: boolean
  priority?: boolean
  onSelect: () => void
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  isRecorded,
  disabled,
  priority = false,
  onSelect,
}: CandidateCardProps) {
  const isInteractive = !disabled && !isRecorded

  return (
    <button
      type="button"
      role="radio"
      disabled={disabled}
      onClick={onSelect}
      aria-checked={isRecorded}
      aria-disabled={disabled || undefined}
      aria-label={`${candidate.full_name}, ${candidate.academic_year}${isRecorded ? ', vote recorded' : ''}`}
      className={cn(
        'group relative flex w-full min-w-0 flex-col overflow-hidden border bg-card text-left shadow-sm',
        memberCardRadiusClass,
        transitionInteractive,
        isRecorded && 'border-primary/40 ring-2 ring-primary/30 shadow-md',
        isInteractive && 'border-border/70 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:ring-1 hover:ring-primary/20',
        disabled && !isRecorded && 'cursor-default opacity-55',
        disabled && 'cursor-default',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={optimizeCloudinaryUrl(candidate.photo_url, 480, '4:3')}
          alt=""
          width={480}
          height={360}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className={cn(
            'h-full w-full object-cover transition-transform duration-300',
            isInteractive && 'group-hover:scale-[1.03]',
          )}
        />
        {isRecorded ? (
          <>
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-background/95 via-background/25 to-transparent p-3 sm:p-4">
              <Badge variant="success" className="gap-1 shadow-sm">
                <Check className="h-3 w-3" aria-hidden="true" />
                Vote recorded
              </Badge>
            </div>
            <div
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
              aria-hidden="true"
            >
              <Check className="h-4 w-4" />
            </div>
          </>
        ) : null}
      </div>
      <div className="space-y-1 border-t border-border/50 p-4 sm:p-5">
        <p className="break-words text-base font-semibold leading-snug tracking-tight">
          {candidate.full_name}
        </p>
        <p className="text-sm text-muted-foreground">{candidate.academic_year}</p>
      </div>
    </button>
  )
})
