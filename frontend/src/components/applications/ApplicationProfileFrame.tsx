import { cn } from '@/lib/utils'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'

const FRAME_SIZE = {
  md: {
    shell: 'h-[5.75rem] w-[5.75rem] p-[3px] sm:h-24 sm:w-24',
    image: 'h-full w-full',
    ring: 'rounded-[1.15rem]',
  },
  lg: {
    shell: 'h-28 w-28 p-1 sm:h-32 sm:w-32',
    image: 'h-full w-full',
    ring: 'rounded-[1.35rem]',
  },
} as const

interface ApplicationProfileFrameProps {
  photoUrl: string
  alt: string
  size?: keyof typeof FRAME_SIZE
  className?: string
}

export function ApplicationProfileFrame({
  photoUrl,
  alt,
  size = 'lg',
  className,
}: ApplicationProfileFrameProps) {
  const dimensions = FRAME_SIZE[size]

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-[1.4rem] bg-gradient-to-br from-white/90 via-card to-muted/40 p-[3px] shadow-[0_12px_32px_-16px_hsl(var(--shadow-color)/0.22),inset_0_1px_0_hsl(0_0%_100%/0.85)] ring-1 ring-border/70 dark:from-white/[0.08] dark:via-card dark:to-muted/20 dark:shadow-[0_12px_32px_-16px_hsl(var(--shadow-color)/0.65)] dark:ring-border/80',
        dimensions.shell,
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full bg-primary/10 blur-xl dark:bg-primary/20"
      />
      <img
        src={optimizeCloudinaryUrl(photoUrl, size === 'lg' ? 160 : 128)}
        alt={alt}
        className={cn(
          dimensions.image,
          dimensions.ring,
          'relative object-cover shadow-[inset_0_1px_0_hsl(0_0%_100%/0.55)] ring-1 ring-inset ring-border/50 dark:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] dark:ring-border/60',
        )}
      />
    </div>
  )
}
