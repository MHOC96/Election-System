import { NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { NavItem } from '@/lib/navigation'
import { handleNavPrefetch } from '@/lib/prefetch'
import { cn } from '@/lib/utils'

interface HeaderNavProps {
  items: NavItem[]
  className?: string
  prefetchScope?: 'admin' | 'member'
}

export function HeaderNav({ items, className, prefetchScope }: HeaderNavProps) {
  const queryClient = useQueryClient()

  const prefetch = (to: string) => {
    if (!prefetchScope) return
    handleNavPrefetch(to, queryClient, prefetchScope)
  }

  return (
    <nav className={cn('hidden items-center gap-1 sm:flex', className)}>
      {items.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onMouseEnter={() => prefetch(to)}
          onFocus={() => prefetch(to)}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
