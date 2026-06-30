import { Suspense, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { prefetchMemberData, prefetchMemberRoutes, scheduleIdle } from '@/lib/prefetch'
import { PageLoader } from '@/components/shared/PageLoader'
import { toast } from 'sonner'

const navItems = [
  { to: '/vote', label: 'Ballot' },
  { to: '/my-votes', label: 'My Votes' },
]

export function MemberLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    prefetchMemberData(queryClient)
    scheduleIdle(prefetchMemberRoutes)
  }, [queryClient])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch {
      toast.error('Failed to log out')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Executive Election</p>
            <h1 className="text-lg font-bold">Member Voting Portal</h1>
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.cpm_number}</span>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 pb-12">
        <Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <Link to="/vote" className="hover:text-foreground">
          Secure voting — one vote per position, irreversible
        </Link>
      </footer>
    </div>
  )
}
