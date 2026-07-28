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
  brandMarkClass,
  shellHeaderBarClass,
} from '@/lib/design-tokens'
import { warmMemberConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ShellActions } from '@/components/layout/ShellActions'
import { MemberPhaseStrip } from '@/components/member/MemberPhaseStrip'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

function MemberBrandMark() {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2.5 rounded-xl">
      <div className={cn(brandMarkClass, 'h-9 w-9 shrink-0')}>
        <Vote className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="shrink-0 leading-none">
        <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Election System
        </p>
        <p className="mt-0.5 whitespace-nowrap text-sm font-semibold leading-tight">Member Portal</p>
      </div>
    </Link>
  )
}

export function MemberLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { data: ongoingElection } = useOngoingElection({ poll: false })
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
    <div className={memberShellClass}>
      <SkipToContent />

      <header className={memberShellHeaderClass}>
        <div className={cn(memberShellHeaderInnerClass, 'gap-2.5 py-3 sm:py-0')}>
          <div className="flex flex-col gap-2.5 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <MemberBrandMark />
              <ShellActions
                compact
                cpmNumber={user?.cpm_number}
                onLogout={() => void handleLogout()}
                isLoggingOut={isLoggingOut}
              />
            </div>
            {phase ? <MemberPhaseStrip phase={phase} /> : null}
          </div>

          <div className={cn(shellHeaderBarClass, 'hidden w-full gap-3 sm:flex')}>
            <MemberBrandMark />
            <div className="flex min-w-0 flex-1 justify-center overflow-hidden px-2">
              {phase ? <MemberPhaseStrip phase={phase} variant="pill" /> : null}
            </div>
            <ShellActions
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
              showMenuButton={false}
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
