import { Suspense, useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { memberNavItems } from '@/lib/navigation'
import { shellContentClass } from '@/lib/design-tokens'
import { prefetchMemberLanding, warmMemberLanding } from '@/lib/prefetch'
import { HeaderNav } from '@/components/layout/HeaderNav'
import { MobileNavSheet } from '@/components/layout/MobileNavSheet'
import { SecureSessionBanner } from '@/components/layout/SecureSessionBanner'
import { ShellActions } from '@/components/layout/ShellActions'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { PageLoader } from '@/components/shared/PageLoader'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { toast } from 'sonner'

export function MemberLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    prefetchMemberLanding(queryClient)
    warmMemberLanding()
  }, [queryClient])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    queryClient.cancelQueries()
    queryClient.clear()
    try {
      await logout()
      navigate('/login', { replace: true })
      toast.success('Logged out successfully')
    } catch {
      navigate('/login', { replace: true })
      toast.error('Failed to log out')
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, logout, navigate, queryClient])

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SkipToContent />
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/vote" className="flex min-w-0 shrink items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Vote className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Member Portal</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Executive Election
              </p>
            </div>
          </Link>

          <HeaderNav items={memberNavItems} prefetchScope="member" />

          <ShellActions
            cpmNumber={user?.cpm_number}
            onLogout={() => void handleLogout()}
            isLoggingOut={isLoggingOut}
            showMenuButton
            menuButtonClassName="sm:hidden"
            onMenuClick={() => setMobileNavOpen(true)}
          />
        </div>
      </header>

      <SecureSessionBanner />

      <main id={MAIN_CONTENT_ID} className="flex-1 px-4 py-6" tabIndex={-1}>
        <div className={`${shellContentClass} max-w-5xl`}>
          <Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <MobileNavSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        title="Member Portal"
        description="Secure voting"
        items={memberNavItems}
        prefetchScope="member"
        footer={
          <>
            Signed in as <span className="font-medium text-foreground">{user?.cpm_number}</span>
          </>
        }
      />
    </div>
  )
}
