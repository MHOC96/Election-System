import { Loader2, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { cn } from '@/lib/utils'

interface ShellActionsProps {
  cpmNumber?: string
  onLogout: () => void
  isLoggingOut?: boolean
  onMenuClick?: () => void
  showMenuButton?: boolean
  menuButtonClassName?: string
  /** Icon-only actions for narrow mobile headers */
  compact?: boolean
}

export function ShellActions({
  cpmNumber,
  onLogout,
  isLoggingOut,
  onMenuClick,
  showMenuButton,
  menuButtonClassName = 'lg:hidden',
  compact = false,
}: ShellActionsProps) {
  return (
    <div className={cn('flex shrink-0 items-center', compact ? 'gap-0.5' : 'gap-1 sm:gap-2')}>
      {cpmNumber && !compact ? (
        <span className="hidden max-w-[8rem] truncate text-sm text-muted-foreground md:inline">
          {cpmNumber}
        </span>
      ) : null}
      {showMenuButton && onMenuClick ? (
        <Button
          variant="ghost"
          size="icon"
          className={menuButtonClassName}
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}
      {!compact ? <ThemeToggle /> : null}
      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'h-10 w-10 shrink-0' : undefined}
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
