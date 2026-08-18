import { AlertCircle } from 'lucide-react'
import type { UserMessage } from '@/lib/user-messages'
import { cn } from '@/lib/utils'

interface FormErrorAlertProps {
  message: UserMessage
  className?: string
  id?: string
}

/** Persistent inline form error — stays visible until the user retries or edits the form. */
export function FormErrorAlert({ message, className, id }: FormErrorAlertProps) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3 text-destructive dark:bg-destructive/15',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-snug">{message.title}</p>
          {message.description && message.description !== message.title ? (
            <p className="text-sm leading-relaxed text-destructive/90">{message.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
