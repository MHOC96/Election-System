import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  brandMarkClass,
  memberShellContentClass,
  memberShellHeaderClass,
  memberShellHeaderInnerClass,
  memberShellMainClass,
  shellCanvasClass,
} from '@/lib/design-tokens'
import { warmMemberConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ShellActions } from '@/components/layout/ShellActions'
import { MemberPhaseStrip } from '@/components/member/MemberPhaseStrip'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
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
    <Link to="/" className="flex min-w-0 items-center gap-2.5 overflow-hidden sm:gap-3">
      <div
        className={cn(
          brandMarkClass,
          'shrink-0 shadow-md',
          compact ? 'h-10 w-10' : 'h-9 w-9 sm:h-10 sm:w-10',
        )}
      >
        <Vote className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            'truncate font-semibold tracking-tight',
            compact ? 'text-sm' : 'text-sm sm:text-base',
          )}
        >
          Member Portal
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
          {cpmNumber ? `CPM ${cpmNumber}` : 'Executive Committee Election'}
          {electionName ? (
            <>
              <span className="mx-1.5 text-border" aria-hidden="true">
                ·
              </span>
              <span className="text-foreground/75">{electionName}</span>
            </>
          ) : null}
        </p>
      </div>
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
    <div className={cn('flex min-h-[100dvh] min-w-0 flex-col', shellCanvasClass)}>
      <SkipToContent />

      <header className={memberShellHeaderClass}>
        <div
          className={cn(
            memberShellHeaderInnerClass,
            'border-b border-border/40 bg-gradient-to-b from-card/90 via-card/80 to-transparent px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8 xl:px-10',
          )}
        >
          {/* Mobile header */}
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

          {/* Tablet & desktop header */}
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
