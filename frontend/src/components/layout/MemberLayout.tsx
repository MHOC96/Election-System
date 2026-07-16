import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { brandMarkClass, shellCanvasClass, shellContentClass } from '@/lib/design-tokens'
import { warmMemberConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ShellActions } from '@/components/layout/ShellActions'

import { SkipToContent } from '@/components/shared/SkipToContent'
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
      <header className="glass sticky top-0 z-40 w-full border-b">
        <div className="flex h-14 w-full min-w-0 items-center gap-2 px-3 sm:px-4">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <div className={cn(brandMarkClass, 'h-8 w-8 shrink-0 sm:h-9 sm:w-9')}>
              <Vote className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold leading-tight">Member Portal</p>
              <p className="truncate text-xs text-muted-foreground">Executive Committee Election</p>
            </div>
            <p className="truncate text-sm font-semibold leading-tight sm:hidden">Portal</p>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center px-1 sm:flex">
            {phase ? <ElectionStatusBadge status={phase} /> : null}
          </div>

          <div className="ml-auto shrink-0">
            <ShellActions
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>

        {phase ? (
          <div className="flex justify-center border-t border-border/60 px-3 py-1.5 sm:hidden">
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

      <main
        id={MAIN_CONTENT_ID}
        className="min-w-0 flex-1 px-3 py-5 sm:px-4 sm:py-6"
        tabIndex={-1}
      >
        <div className={`${shellContentClass} mx-auto w-full max-w-5xl`}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
