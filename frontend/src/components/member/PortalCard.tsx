import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { accentScope, type PortalAccent } from '@/lib/portal-accent'
import { cn } from '@/lib/utils'

type SurfaceTone = 'default' | 'muted' | 'accent'

interface SurfaceOptions {
  tone?: SurfaceTone
  raised?: boolean
  interactive?: boolean
  selected?: boolean
}

/**
 * Class string for a portal surface. Exported so elements that cannot be a
 * `PortalCard` — a `<button>` tile, for instance — still share one source of
 * truth for surface colour, border, and elevation.
 */
export function portalSurfaceClass({
  tone = 'default',
  raised = false,
  interactive = false,
  selected = false,
}: SurfaceOptions = {}): string {
  return cn(
    'portal-surface',
    tone === 'muted' && 'portal-surface--muted',
    tone === 'accent' && 'portal-surface--accent',
    raised && 'portal-surface--raised',
    interactive && 'portal-surface--interactive',
    selected && 'portal-surface--selected',
    'transition-colors duration-200',
  )
}

interface PortalCardProps extends HTMLAttributes<HTMLDivElement>, SurfaceOptions {
  /** Re-tints this card and everything inside it. */
  accent?: PortalAccent
  as?: 'div' | 'section' | 'article'
  children: ReactNode
}

export const PortalCard = forwardRef<HTMLDivElement, PortalCardProps>(function PortalCard(
  { accent, as: Tag = 'div', tone, raised, interactive, selected, className, children, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        portalSurfaceClass({ tone, raised, interactive, selected }),
        'min-w-0 overflow-hidden rounded-2xl',
        accent && accentScope(accent),
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
})

/** Tinted band at the top of a card. Pairs with `PortalCardContent` below. */
export function PortalCardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'portal-surface__header px-5 py-4 sm:px-6 sm:py-5 lg:px-7',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function PortalCardContent({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-5 sm:px-6 sm:py-6 lg:px-7', className)} {...rest}>
      {children}
    </div>
  )
}

export function PortalCardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'portal-divider border-t px-5 py-4 sm:px-6 sm:py-5 lg:px-7',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function PortalCardTitle({
  className,
  children,
  as: Tag = 'h2',
  ...rest
}: HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' }) {
  return (
    <Tag
      className={cn(
        'portal-heading text-balance text-lg font-semibold leading-snug tracking-tight sm:text-xl',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function PortalCardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('portal-subtle mt-1.5 text-pretty text-sm leading-relaxed', className)}
      {...rest}
    >
      {children}
    </p>
  )
}

const ICON_TILE_SIZE = {
  sm: 'h-9 w-9 rounded-lg',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-14 w-14 rounded-2xl',
} as const

/** Accent-tinted square that holds a lucide icon. */
export function PortalIconTile({
  size = 'md',
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { size?: keyof typeof ICON_TILE_SIZE }) {
  return (
    <div
      className={cn(
        'portal-accent-soft portal-accent-text portal-accent-border flex shrink-0 items-center justify-center border',
        ICON_TILE_SIZE[size],
        className,
      )}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </div>
  )
}

/** Small accent pill for statuses and counts. */
export function PortalChip({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'portal-accent-soft portal-accent-text portal-accent-border inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

/** Pulsing dot used to signal a live phase (voting open, applications open). */
export function PortalLiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-2 w-2 shrink-0', className)} aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
    </span>
  )
}
