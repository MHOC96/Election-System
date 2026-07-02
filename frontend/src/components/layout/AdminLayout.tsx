import { Suspense, useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { adminNavItems } from '@/lib/navigation'
import { shellContentClass } from '@/lib/design-tokens'
import { prefetchAdminLanding } from '@/lib/prefetch'
import { MobileNavSheet } from '@/components/layout/MobileNavSheet'
import { ShellActions } from '@/components/layout/ShellActions'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { PageLoader } from '@/components/shared/PageLoader'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { toast } from 'sonner'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    prefetchAdminLanding(queryClient)
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
    <div className="flex min-h-screen bg-muted/30">
      <SkipToContent />
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="border-b px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Vote className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Election System
              </p>
              <p className="text-sm font-semibold leading-tight">Admin Console</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNav items={adminNavItems} prefetchScope="admin" />
        </div>
        <div className="border-t p-4 text-xs text-muted-foreground">
          Signed in as{' '}
          <span className="font-medium text-foreground">{user?.cpm_number}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <Link to="/admin" className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Vote className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <span className="truncate text-sm font-semibold">Admin Console</span>
              </Link>
            </div>
            <div className="hidden lg:block" aria-hidden="true" />
            <ShellActions
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
              showMenuButton
              onMenuClick={() => setMobileNavOpen(true)}
            />
          </div>
        </header>

        <main id={MAIN_CONTENT_ID} className="flex-1 p-4 lg:p-8" tabIndex={-1}>
          <div className={shellContentClass}>
            <Suspense fallback={<PageLoader className="min-h-[50vh]" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <MobileNavSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        title="Admin Console"
        description="Election management"
        items={adminNavItems}
        prefetchScope="admin"
        footer={
          <>
            Signed in as <span className="font-medium text-foreground">{user?.cpm_number}</span>
          </>
        }
      />
    </div>
  )
}
