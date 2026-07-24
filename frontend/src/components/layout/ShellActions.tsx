import { Loader2, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { shellActionToolbarClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ShellActionsProps {
  cpmNumber?: string
  onLogout: () => void
  isLoggingOut?: boolean
  onMenuClick?: () => void
  showMenuButton?: boolean
  menuButtonClassName?: string
  /** Icon-only logout for narrow headers */
  compact?: boolean
  showThemeToggle?: boolean
  className?: string
}

export function ShellActions({
  cpmNumber,
  onLogout,
  isLoggingOut,
  onMenuClick,
  showMenuButton,
  menuButtonClassName = 'lg:hidden',
  compact = false,
  showThemeToggle = true,
  className,
}: ShellActionsProps) {
  return (
    <div className={cn(shellActionToolbarClass, className)}>
      {cpmNumber && !compact ? (
        <span className="hidden max-w-[9rem] truncate rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium tabular-nums text-muted-foreground md:inline">
          {cpmNumber}
        </span>
      ) : null}

      {showMenuButton && onMenuClick ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9 shrink-0 sm:h-10 sm:w-10', menuButtonClassName)}
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      ) : null}

      {showThemeToggle ? <ThemeToggle /> : null}

      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon' : 'sm'}
        className={cn(
          'shrink-0',
          compact ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-9 gap-1.5 px-3 sm:h-10',
        )}
        onClick={onLogout}
        disabled={isLoggingOut}
        aria-label="Log out"
        aria-busy={isLoggingOut}
      >
        {isLoggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden="true" />
        )}
        {!compact ? (
          <span className="hidden sm:inline">{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
        ) : null}
      </Button>
    </div>
  )
}
