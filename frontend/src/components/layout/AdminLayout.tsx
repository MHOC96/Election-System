import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Vote, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { adminNavItems } from '@/lib/navigation'
import {
  shellContentClass,
  shellCanvasClass,
  brandMarkClass,
  shellHeaderBarClass,
  shellMobileHeaderClass,
} from '@/lib/design-tokens'
import { warmAdminConsole, resetConsoleWarmupState } from '@/lib/prefetch'
import { MobileNavSheet } from '@/components/layout/MobileNavSheet'
import { AdminSidebarFooter } from '@/components/layout/AdminSidebarFooter'
import { ShellActions } from '@/components/layout/ShellActions'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

function AdminBrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <div className={cn(brandMarkClass, 'h-9 w-9 shrink-0')}>
        <Vote className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 leading-none">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Election System
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold leading-tight">Admin Console</p>
      </div>
    </div>
  )
}

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
      notifyError('Sign-out failed', 'We could not sign you out. Please refresh the page and try again.')
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, logout, navigate, queryClient])

  return (
    <div className={cn('flex min-h-screen min-w-0', shellCanvasClass)}>
      <SkipToContent />
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className={cn(shellHeaderBarClass, 'border-b px-6')}>
          <AdminBrandMark />
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
          <div className={cn(shellMobileHeaderClass, 'lg:hidden')}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>

            <Link to="/admin" className="min-w-0 flex-1 overflow-hidden">
              <AdminBrandMark />
            </Link>

            <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/70 bg-background/70 p-0.5 shadow-sm backdrop-blur">
              <ThemeToggle />
              <ShellActions
                compact
                cpmNumber={user?.cpm_number}
                onLogout={() => void handleLogout()}
                isLoggingOut={isLoggingOut}
                showMenuButton={false}
              />
            </div>
          </div>

          <div className={cn(shellHeaderBarClass, 'hidden w-full gap-2 px-8 lg:flex')}>
            <div className="flex-1" aria-hidden="true" />
            <ShellActions
              cpmNumber={user?.cpm_number}
              onLogout={() => void handleLogout()}
              isLoggingOut={isLoggingOut}
              showMenuButton={false}
            />
          </div>
        </header>

        <main id={MAIN_CONTENT_ID} className="min-w-0 flex-1 p-4 lg:p-8" tabIndex={-1}>
          <div className={shellContentClass}>
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNavSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        title="Admin Console"
        items={adminNavItems}
        prefetchScope="admin"
        footer={<AdminSidebarFooter />}
      />
    </div>
  )
}
