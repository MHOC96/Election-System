import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow,border-color] duration-150 file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground hover:border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30 dark:[color-scheme:dark] md:h-10 md:text-sm md:file:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
