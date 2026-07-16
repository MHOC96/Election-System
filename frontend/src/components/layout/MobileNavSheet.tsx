import { useEffect } from 'react'
import { Vote } from 'lucide-react'
import type { NavItem } from '@/lib/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { brandMarkClass, shellMobileHeaderClass } from '@/lib/design-tokens'
import { warmAdminConsole } from '@/lib/prefetch'
import { cn } from '@/lib/utils'

interface MobileNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  items: NavItem[]
  footer?: React.ReactNode
  prefetchScope?: 'admin' | 'member'
}

export function MobileNavSheet({
  open,
  onOpenChange,
  title,
  items,
  footer,
  prefetchScope,
}: MobileNavSheetProps) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open || prefetchScope !== 'admin') return
    warmAdminConsole(queryClient)
  }, [open, prefetchScope, queryClient])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex h-full w-[min(100vw,20rem)] max-w-none flex-col border-r p-0 sm:max-w-xs">
        <div
          className={cn(
            shellMobileHeaderClass,
            'justify-between border-b px-4 pr-14',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={cn(brandMarkClass, 'h-9 w-9 shrink-0')}>
              <Vote className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-none">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Election System
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold leading-tight">{title}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNav
            items={items}
            onNavigate={() => onOpenChange(false)}
            prefetchScope={prefetchScope}
          />
        </div>
        {footer ? <div className="border-t p-4 text-xs text-muted-foreground">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  )
}
