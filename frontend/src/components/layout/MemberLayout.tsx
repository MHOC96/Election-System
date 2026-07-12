import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { shellContentClass } from '@/lib/design-tokens'
import { warmMemberConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ShellActions } from '@/components/layout/ShellActions'
import { CreatorFooter } from '@/components/layout/CreatorFooter'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { ElectionStatusBadge } from '@/components/shared/StatusBadge'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { notifyError } from '@/lib/notify'

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
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SkipToContent />
      <header className="glass sticky top-0 z-40 w-full border-b">
        <div className="flex h-14 w-full items-center gap-2 px-3 sm:px-4">
          {/* Logo — shrinks gracefully */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-sm sm:h-9 sm:w-9">
              <Vote className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold leading-tight">Member Portal</p>
              <p className="truncate text-xs text-muted-foreground">
                Executive Committee Election
              </p>
            </div>
            {/* xs-only: show just the title, no subtitle */}
            <p className="truncate text-sm font-semibold leading-tight sm:hidden">
              Member Portal
            </p>
          </Link>

          {/* Spacer — badge visible on all screen sizes */}
          <div className="flex min-w-0 flex-1 items-center justify-center px-1">
            {phase ? (
              <>
                {/* Full badge on sm+ */}
                <span className="hidden sm:inline">
                  <ElectionStatusBadge status={phase} />
                </span>
                {/* Compact pill on xs */}
                <span
                  className={`inline-flex sm:hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    phase === 'VOTING_OPEN'
                      ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                      : phase === 'APPLICATIONS_OPEN' || phase === 'REVIEWING'
                        ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                        : 'border-border bg-muted text-muted-foreground'
                  }`}
                  aria-label={`Election phase: ${phase.replace(/_/g, ' ')}`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      phase === 'VOTING_OPEN'
                        ? 'bg-green-500'
                        : phase === 'APPLICATIONS_OPEN' || phase === 'REVIEWING'
                          ? 'bg-yellow-500'
                          : 'bg-muted-foreground/50'
                    }`}
                  />
                  {phase === 'VOTING_OPEN'
                    ? 'Voting'
                    : phase === 'APPLICATIONS_OPEN'
                      ? 'Applications'
                      : phase === 'REVIEWING'
                        ? 'Reviewing'
                        : phase === 'READY_FOR_VOTING'
                          ? 'Ready'
                          : phase === 'RESULTS_PUBLISHED'
                            ? 'Results'
                            : phase === 'VOTING_CLOSED'
                              ? 'Closed'
                              : phase === 'SCHEDULED'
                                ? 'Scheduled'
                                : 'Inactive'}
                </span>
              </>
            ) : null}
          </div>

          {/* Actions — always on the right */}
          <ShellActions
            cpmNumber={user?.cpm_number}
            onLogout={() => void handleLogout()}
            isLoggingOut={isLoggingOut}
          />
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} className="flex-1 px-3 py-5 sm:px-4 sm:py-6" tabIndex={-1}>
        <div className={`${shellContentClass} mx-auto max-w-5xl`}>
          <Outlet />
        </div>
      </main>

      <CreatorFooter />
    </div>
  )
}
