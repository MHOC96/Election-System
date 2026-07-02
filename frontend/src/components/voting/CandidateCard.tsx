import { memo } from 'react'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { Check } from 'lucide-react'
import type { Candidate } from '@/types/api'
import { Badge } from '@/components/ui/badge'
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
        'group relative flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isRecorded && 'ring-2 ring-primary',
        !disabled && !isRecorded && 'hover:border-primary/50 hover:shadow-sm',
        disabled && !isRecorded && 'cursor-default opacity-50',
        disabled && 'cursor-default',
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={optimizeCloudinaryUrl(candidate.photo_url, 480)}
          alt=""
          width={480}
          height={360}
          sizes="(max-width: 640px) 100vw, 480px"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="h-full w-full object-cover"
        />
        {isRecorded && (
          <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-background/90 via-background/20 to-transparent p-3">
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" aria-hidden="true" />
              Vote recorded
            </Badge>
          </div>
        )}
        {isRecorded && (
          <div
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-4">
        <p className="font-semibold leading-tight">{candidate.full_name}</p>
        <p className="text-sm text-muted-foreground">{candidate.academic_year}</p>
      </div>
    </button>
  )
})
