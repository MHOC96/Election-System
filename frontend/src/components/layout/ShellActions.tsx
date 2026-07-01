import { Loader2, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

interface ShellActionsProps {
  cpmNumber?: string
  onLogout: () => void
  isLoggingOut?: boolean
  onMenuClick?: () => void
  showMenuButton?: boolean
  menuButtonClassName?: string
}

export function ShellActions({
  cpmNumber,
  onLogout,
  isLoggingOut,
  onMenuClick,
  showMenuButton,
  menuButtonClassName = 'lg:hidden',
}: ShellActionsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {cpmNumber ? (
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
      <ThemeToggle />
      <Button
        type="button"
        variant="outline"
        size="sm"
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
        <span className="hidden sm:inline">{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
      </Button>
    </div>
  )
}
