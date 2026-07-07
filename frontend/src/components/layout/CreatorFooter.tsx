import { cn } from '@/lib/utils'

export const CREATOR_GITHUB_URL = 'https://github.com/MHOC96'

export function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  )
}

interface CreatorCreditProps {
  className?: string
}

/** Compact inline credit for admin sidebar. */
export function CreatorCredit({ className }: CreatorCreditProps) {
  return (
    <a
      href={CREATOR_GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground transition-colors',
        'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      aria-label="Created by @MHOC96 — visit GitHub profile (opens in new tab)"
    >
      <span className="whitespace-nowrap">Created by</span>
      <GitHubIcon className="h-3.5 w-3.5 text-[#1f2328] dark:text-[#e6edf3]" />
      <span className="whitespace-nowrap font-semibold text-foreground">@MHOC96</span>
    </a>
  )
}

interface CreatorFooterProps {
  className?: string
  variant?: 'default' | 'minimal'
}

export function CreatorFooter({ className, variant = 'default' }: CreatorFooterProps) {
  const isMinimal = variant === 'minimal'

  return (
    <footer
      className={cn(
        'shrink-0',
        isMinimal
          ? 'bg-transparent py-4'
          : 'border-t border-border/60 bg-background/70 py-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
          Created by
        </p>
        <a
          href={CREATOR_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-200',
            'border-border/70 bg-card/80 text-foreground shadow-sm',
            'hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:text-primary hover:shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          aria-label="Visit MHOC on GitHub (opens in new tab)"
        >
          <GitHubIcon className="h-4 w-4 text-[#1f2328] transition-transform duration-200 group-hover:scale-110 dark:text-[#e6edf3]" />
          <span className="bg-gradient-to-r from-foreground to-foreground bg-clip-text transition-colors group-hover:from-primary group-hover:to-primary">
            MHOC
          </span>
          <span className="hidden text-xs font-normal text-muted-foreground transition-colors group-hover:text-primary/80 sm:inline">
            @MHOC96
          </span>
        </a>
      </div>
    </footer>
  )
}
