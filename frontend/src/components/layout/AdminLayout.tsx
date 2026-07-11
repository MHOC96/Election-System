import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { adminNavItems } from '@/lib/navigation'
import { shellContentClass } from '@/lib/design-tokens'
import { warmAdminConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { MobileNavSheet } from '@/components/layout/MobileNavSheet'
import { AdminSidebarFooter } from '@/components/layout/AdminSidebarFooter'
import { ShellActions } from '@/components/layout/ShellActions'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { notifyError } from '@/lib/notify'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    warmAdminConsole(queryClient)
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
    <div className="flex min-h-screen bg-muted/30">
      <SkipToContent />
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="border-b px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-sm">
              <Vote className="h-[18px] w-[18px]" aria-hidden="true" />
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
        <div className="border-t p-4">
          <AdminSidebarFooter />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 w-full border-b">
          <div className="flex h-14 w-full items-center gap-1 px-2 sm:gap-2 sm:px-4 lg:px-8">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>

            <Link to="/admin" className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-sm">
                <Vote className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="truncate text-sm font-semibold">Admin Console</span>
            </Link>

            <div className="hidden flex-1 lg:block" aria-hidden="true" />

            <div className="ml-auto shrink-0">
              <ShellActions
                cpmNumber={user?.cpm_number}
                onLogout={() => void handleLogout()}
                isLoggingOut={isLoggingOut}
                showMenuButton={false}
              />
            </div>
          </div>
        </header>

        <main id={MAIN_CONTENT_ID} className="flex-1 p-4 lg:p-8" tabIndex={-1}>
          <div className={shellContentClass}>
            <Outlet />
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
        footer={<AdminSidebarFooter />}
      />
    </div>
  )
}
