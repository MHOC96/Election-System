import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { shellContentClass } from '@/lib/design-tokens'
import { warmMemberConsole } from '@/lib/prefetch'
import { ShellActions } from '@/components/layout/ShellActions'
import { CreatorFooter } from '@/components/layout/CreatorFooter'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { notifyError } from '@/lib/notify'

export function MemberLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    warmMemberConsole(queryClient)
  }, [queryClient])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    queryClient.cancelQueries()
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
        <div className="flex h-14 w-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
          <Link to="/vote" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-sm">
              <Vote className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Member Portal</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Executive Committee Election
              </p>
            </div>
          </Link>

          <ShellActions
            cpmNumber={user?.cpm_number}
            onLogout={() => void handleLogout()}
            isLoggingOut={isLoggingOut}
          />
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} className="flex-1 px-4 py-6" tabIndex={-1}>
        <div className={`${shellContentClass} mx-auto max-w-5xl`}>
          <Outlet />
        </div>
      </main>

      <CreatorFooter />
    </div>
  )
}
