import { memo } from 'react'
import { Check } from 'lucide-react'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { portalSurfaceClass } from '@/components/member/PortalCard'
import { memberCardRadiusClass } from '@/lib/design-tokens'
import { accentScope } from '@/lib/portal-accent'
import { cn } from '@/lib/utils'
import type { Candidate } from '@/types/api'

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
        'group flex w-full min-w-0 flex-col text-left',
        portalSurfaceClass({ interactive: isInteractive, selected: isRecorded }),
        memberCardRadiusClass,
        'overflow-hidden',
        // A recorded vote always reads green, whatever the page accent is.
        isRecorded && accentScope('success'),
        disabled && !isRecorded && 'cursor-default opacity-60',
        disabled && 'cursor-default',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-portal-canvas',
      )}
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-portal-muted">
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
            'h-full w-full object-cover transition-transform duration-500 ease-out-expo',
            isInteractive && 'group-hover:scale-[1.04]',
          )}
        />

        {isRecorded ? (
          <>
            {/* Scrim keeps the badge legible over any photo, in both themes */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-3 pt-10 sm:p-4 sm:pt-12 bg-gradient-to-t from-portal-surface via-portal-surface/70 to-transparent">
              <span className="portal-accent-text inline-flex items-center gap-1.5 text-xs font-semibold">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Vote recorded
              </span>
            </span>
            <span
              className="portal-accent-fill absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-portal"
              aria-hidden="true"
            >
              <Check className="h-4 w-4" />
            </span>
          </>
        ) : null}
      </span>

      <span className="block space-y-1 p-4 sm:p-5">
        <span className="portal-heading block break-words text-base font-semibold leading-snug tracking-tight">
          {candidate.full_name}
        </span>
        <span className="portal-subtle block text-sm">{candidate.academic_year}</span>
      </span>
    </button>
  )
})
