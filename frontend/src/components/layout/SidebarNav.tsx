import { NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { NavItem } from '@/lib/navigation'
import { handleNavPrefetch } from '@/lib/prefetch'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  items: NavItem[]
  onNavigate?: () => void
  className?: string
  prefetchScope?: 'admin' | 'member'
}

export function SidebarNav({
  items,
  onNavigate,
  className,
  prefetchScope,
}: SidebarNavProps) {
  const queryClient = useQueryClient()

  const prefetch = (to: string) => {
    if (!prefetchScope) return
    handleNavPrefetch(to, queryClient, prefetchScope)
  }

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          onMouseEnter={() => prefetch(to)}
          onFocus={() => prefetch(to)}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )
          }
        >
          {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
