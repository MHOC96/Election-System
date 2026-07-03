import { useEffect } from 'react'
import type { NavItem } from '@/lib/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { warmAdminConsole } from '@/lib/prefetch'

interface MobileNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  items: NavItem[]
  footer?: React.ReactNode
  prefetchScope?: 'admin' | 'member'
}

export function MobileNavSheet({
  open,
  onOpenChange,
  title,
  description,
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
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
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
