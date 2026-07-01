import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex min-h-[40vh] items-center justify-center', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page content"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    </div>
  )
}
