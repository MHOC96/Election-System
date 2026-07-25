import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  memberShellClass,
  memberShellContentClass,
  memberShellHeaderClass,
  memberShellHeaderInnerClass,
  memberShellMainClass,
} from '@/lib/design-tokens'
import { warmMemberConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ShellActions } from '@/components/layout/ShellActions'
import { MemberPhaseStrip } from '@/components/member/MemberPhaseStrip'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { memberPhaseAccent } from '@/lib/member-phase-ui'
import { accentScope } from '@/lib/portal-accent'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

function MemberBrandMark({
  cpmNumber,
  electionName,
  compact = false,
}: {
  cpmNumber?: string
  electionName?: string
  compact?: boolean
}) {
  return (
    <Link
      to="/"
      className="group flex min-w-0 items-center gap-3 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-portal-surface"
    >
      <span
        className={cn(
          'portal-accent-fill flex shrink-0 items-center justify-center rounded-xl',
          compact ? 'h-10 w-10' : 'h-10 w-10 sm:h-11 sm:w-11',
        )}
        aria-hidden="true"
      >
        <Vote className="h-[1.15rem] w-[1.15rem]" />
      </span>
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            'portal-heading block truncate font-semibold tracking-tight',
            compact ? 'text-sm' : 'text-sm sm:text-base',
          )}
        >
          Member Portal
        </span>
        <span className="portal-subtle mt-0.5 block truncate text-[11px] sm:text-xs">
          {cpmNumber ? `CPM ${cpmNumber}` : 'Executive Committee Election'}
          {electionName ? (
            <>
              <span className="mx-1.5 opacity-50" aria-hidden="true">
                ·
              </span>
              {electionName}
            </>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

export function MemberLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { data: ongoingElection } = useOngoingElection()
  const phase = ongoingElection?.current_phase
  const electionName = ongoingElection?.name

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
    // The phase accent lives on the shell so the header, canvas wash, and
    // every card below inherit the same hue for the current election stage.
    <div className={cn(memberShellClass, accentScope(memberPhaseAccent(phase)))}>
      <SkipToContent />

      <header className={memberShellHeaderClass}>
        <div className={cn(memberShellHeaderInnerClass, 'gap-2.5 py-3 sm:py-3.5')}>
          {/* Mobile */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <MemberBrandMark cpmNumber={user?.cpm_number} electionName={electionName} compact />
              <ShellActions
                compact
                cpmNumber={user?.cpm_number}
                onLogout={() => void handleLogout()}
                isLoggingOut={isLoggingOut}
              />
            </div>
            {phase ? <MemberPhaseStrip phase={phase} /> : null}
          </div>

          {/* Tablet and up */}
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-4 lg:gap-x-6">
            <MemberBrandMark cpmNumber={user?.cpm_number} electionName={electionName} />

            {phase ? (
              <MemberPhaseStrip phase={phase} variant="pill" className="justify-self-center" />
            ) : (
              <span className="justify-self-center" aria-hidden="true" />
            )}

            <ShellActions
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
              className="justify-self-end"
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
