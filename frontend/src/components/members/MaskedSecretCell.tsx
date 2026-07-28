import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MaskedSecretCellProps {
  value?: string | null
  className?: string
  emptyLabel?: string
  revealLabel?: string
  hideLabel?: string
}

export function MaskedSecretCell({
  value,
  className,
  emptyLabel = '—',
  revealLabel = 'Show password',
  hideLabel = 'Hide password',
}: MaskedSecretCellProps) {
  const [visible, setVisible] = useState(false)
  const secret = value?.trim()

  if (!secret) {
    return <span className={cn('text-muted-foreground', className)}>{emptyLabel}</span>
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="min-w-0 truncate font-mono text-sm tabular-nums">
        {visible ? secret : '••••••••'}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? hideLabel : revealLabel}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}
