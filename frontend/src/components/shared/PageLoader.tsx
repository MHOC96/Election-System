import { Loader2 } from 'lucide-react'
import { shellCanvasClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface PageLoaderProps {
  className?: string
  /** Match full app shell height and background (auth bootstrap, route guards). */
  fullScreen?: boolean
  /** Match layout chrome (`bg-muted/30`) instead of plain background. */
  shell?: boolean
}

export function PageLoader({ className, fullScreen = false, shell = false }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        shell ? shellCanvasClass : 'bg-background',
        fullScreen ? 'min-h-[100dvh]' : 'min-h-[40vh]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page content"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    </div>
  )
}
