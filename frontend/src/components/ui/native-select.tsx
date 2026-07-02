import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NativeSelectProps extends React.ComponentProps<'select'> {
  wrapperClassName?: string
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn('relative w-full', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm text-foreground shadow-sm transition-colors',
          'focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:[color-scheme:dark]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
        aria-hidden
      />
    </div>
  ),
)
NativeSelect.displayName = 'NativeSelect'

export { NativeSelect }
