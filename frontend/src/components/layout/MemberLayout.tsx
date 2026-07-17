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

function memberPhaseLabel(phase: string): string {
  switch (phase) {
    case 'VOTING_OPEN':
      return 'Voting is open'
    case 'APPLICATIONS_OPEN':
      return 'Applications are open'
    case 'REVIEWING':
      return 'Applications under review'
    case 'READY_FOR_VOTING':
      return 'Voting starts soon'
    case 'RESULTS_PUBLISHED':
      return 'Results published'
    case 'VOTING_CLOSED':
      return 'Voting has ended'
    case 'SCHEDULED':
      return 'Applications open soon'
    default:
      return phase.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
  }
}

function memberPhaseAccentClass(phase: string): string {
  switch (phase) {
    case 'VOTING_OPEN':
      return 'border-success/25 bg-success/10 text-success'
    case 'APPLICATIONS_OPEN':
      return 'border-warning/30 bg-warning/10 text-warning'
    case 'REVIEWING':
    case 'READY_FOR_VOTING':
      return 'border-primary/20 bg-primary/10 text-primary'
    case 'RESULTS_PUBLISHED':
      return 'border-border/70 bg-muted/40 text-foreground'
    case 'VOTING_CLOSED':
      return 'border-border/70 bg-muted/30 text-muted-foreground'
    case 'SCHEDULED':
      return 'border-border/60 bg-card/60 text-muted-foreground'
    default:
      return 'border-border/60 bg-muted/20 text-muted-foreground'
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
      notifyError('Sign-out failed', 'We could not sign you out. Please refresh the page and try again.')
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, logout, navigate, queryClient])

  return (
    <div className={cn('flex min-h-screen min-w-0 flex-col', shellCanvasClass)}>
      <SkipToContent />
      <header className={memberShellHeaderClass}>
        {/* Mobile — stacked brand, actions, and phase banner */}
        <div className="sm:hidden">
          <div className="border-b border-border/50 bg-gradient-to-b from-card via-card/95 to-muted/25 px-3 pb-3 dark:from-card dark:via-card/90 dark:to-muted/30">
            <div className="flex items-center justify-between gap-3 py-2">
              <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                <div className={cn(brandMarkClass, 'h-10 w-10 shrink-0 shadow-md')}>
                  <Vote className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold tracking-tight">Member Portal</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {user?.cpm_number ? `CPM ${user.cpm_number}` : 'Executive Committee Election'}
                  </p>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border/60 bg-background/90 p-0.5 shadow-sm backdrop-blur-sm">
                <ThemeToggle />
                <ShellActions
                  compact
                  cpmNumber={user?.cpm_number}
                  onLogout={() => void handleLogout()}
                  isLoggingOut={isLoggingOut}
                />
              </div>
            </div>

            {phase ? (
              <div
                className={cn(
                  'mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-xs font-medium leading-snug',
                  memberPhaseAccentClass(phase),
                )}
                role="status"
                aria-label={`Election status: ${memberPhaseLabel(phase)}`}
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                </span>
                <span className="text-pretty">{memberPhaseLabel(phase)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tablet & desktop — logo, centered badge, actions */}
        <div
          className={cn(
            shellMobileHeaderClass,
            'hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-3',
          )}
        >
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 overflow-hidden justify-self-start"
          >
            <div className={cn(brandMarkClass, 'h-9 w-9 shrink-0')}>
              <Vote className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-none">
              <p className="truncate text-sm font-semibold leading-tight">Member Portal</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Executive Committee Election
              </p>
            </div>
          </Link>

          {phase ? (
            <ElectionStatusBadge
              status={phase}
              className="max-w-full shrink-0 justify-self-center truncate text-center text-xs normal-case tracking-normal"
              aria-label={`Election status: ${memberPhaseLabel(phase)}`}
            >
              {memberPhaseLabel(phase)}
            </ElectionStatusBadge>
          ) : (
            <span className="justify-self-center" aria-hidden="true" />
          )}

          <div className="flex shrink-0 items-center justify-self-end justify-end gap-1">
            <ShellActions
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} className={memberShellMainClass} tabIndex={-1}>
        <div className={memberShellContentClass}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
