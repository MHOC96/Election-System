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
    <nav className={cn('flex flex-col gap-0.5', className)}>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          onPointerDown={() => prefetch(to)}
          onMouseEnter={() => prefetch(to)}
          onFocus={() => prefetch(to)}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive
                ? 'bg-primary/[0.08] text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.65),0_0_0_1px_hsl(var(--primary)/0.12)] ring-1 ring-primary/20 dark:bg-primary/[0.14] dark:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.07),0_0_0_1px_hsl(var(--primary)/0.2)] dark:ring-primary/30'
                : 'text-muted-foreground hover:bg-white/70 hover:text-foreground active:scale-[0.99] dark:hover:bg-foreground/[0.04]',
            )
          }
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              {Icon ? (
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.32)] dark:shadow-[0_4px_16px_hsl(var(--primary)/0.42)]'
                      : 'bg-muted/70 text-muted-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.55)] group-hover:bg-muted group-hover:text-foreground dark:bg-muted/40 dark:group-hover:bg-muted/55 dark:shadow-none',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
              <span className="min-w-0 truncate">{label}</span>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2),0_0_10px_hsl(var(--primary)/0.25)] dark:shadow-[0_0_0_4px_hsl(var(--primary)/0.28),0_0_12px_hsl(var(--primary)/0.35)]"
                />
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
