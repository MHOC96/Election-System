import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  brandMarkClass,
  memberShellContentClass,
  memberShellHeaderClass,
  memberShellMainClass,
  shellCanvasClass,
  shellMobileHeaderClass,
} from '@/lib/design-tokens'
import { warmMemberConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ShellActions } from '@/components/layout/ShellActions'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { ElectionStatusBadge } from '@/components/shared/StatusBadge'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

function compactPhaseLabel(phase: string): string {
  switch (phase) {
    case 'VOTING_OPEN':
      return 'Voting'
    case 'APPLICATIONS_OPEN':
      return 'Applications'
    case 'REVIEWING':
      return 'Reviewing'
    case 'READY_FOR_VOTING':
      return 'Ready'
    case 'RESULTS_PUBLISHED':
      return 'Results'
    case 'VOTING_CLOSED':
      return 'Closed'
    case 'SCHEDULED':
      return 'Scheduled'
    default:
      return 'Inactive'
  }
}

export function MemberLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { data: ongoingElection } = useOngoingElection()

  const phase = ongoingElection?.current_phase

  useEffect(() => {
    warmMemberConsole(queryClient)
  }, [queryClient])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    queryClient.cancelQueries()
    resetConsoleWarmupState()
    queryClient.clear()
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      notifyError('Failed to log out')
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, logout, navigate, queryClient])

  return (
    <div className={cn('flex min-h-screen min-w-0 flex-col', shellCanvasClass)}>
      <SkipToContent />
      <header className={memberShellHeaderClass}>
        <div className={cn(shellMobileHeaderClass, 'justify-between gap-2 sm:gap-3')}>
          <Link to="/" className="flex min-w-0 items-center gap-2.5 overflow-hidden">
            <div className={cn(brandMarkClass, 'h-9 w-9 shrink-0')}>
              <Vote className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-none">
              <p className="truncate text-sm font-semibold leading-tight">Member Portal</p>
              <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
                Executive Committee Election
              </p>
            </div>
          </Link>

          <div className="hidden shrink-0 sm:block">
            {phase ? <ElectionStatusBadge status={phase} /> : null}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:hidden">
            <ThemeToggle />
            <ShellActions
              compact
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
            />
          </div>
          <div className="hidden sm:block">
            <ShellActions
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>

        {phase ? (
          <div className="flex justify-center border-t border-border/60 px-4 py-2 sm:hidden">
            <ElectionStatusBadge
              status={phase}
              className="max-w-full truncate text-[10px] uppercase tracking-wide"
              aria-label={`Election phase: ${phase.replace(/_/g, ' ')}`}
            >
              {compactPhaseLabel(phase)}
            </ElectionStatusBadge>
          </div>
        ) : null}
      </header>

      <main id={MAIN_CONTENT_ID} className={memberShellMainClass} tabIndex={-1}>
        <div className={memberShellContentClass}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
