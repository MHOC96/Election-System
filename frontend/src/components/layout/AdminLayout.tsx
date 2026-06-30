import { Suspense, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Shield,
  Sun,
  UserCheck,
  Users,
  Vote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { prefetchAdminData, prefetchAdminRoutes, scheduleIdle } from '@/lib/prefetch'
import { PageLoader } from '@/components/shared/PageLoader'
import { toast } from 'sonner'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/positions', label: 'Positions', icon: ClipboardList },
  { to: '/admin/candidates', label: 'Candidates', icon: UserCheck },
  { to: '/admin/elections', label: 'Elections', icon: Vote },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/audit', label: 'Audit Logs', icon: Shield },
  { to: '/admin/live', label: 'Live Stats', icon: BarChart3 },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    prefetchAdminData(queryClient)
    scheduleIdle(prefetchAdminRoutes)
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
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
        <div className="border-b p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Election System</p>
          <h1 className="mt-1 text-lg font-bold">Admin Console</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.cpm_number}</span>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 lg:px-8">
          <div className="lg:hidden">
            <Link to="/admin" className="font-semibold">
              Admin Console
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b bg-background px-4 py-2 lg:hidden">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium',
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 lg:p-8">
          <Suspense fallback={<PageLoader className="min-h-[50vh]" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
