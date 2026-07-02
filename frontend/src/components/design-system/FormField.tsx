import { Children, cloneElement, isValidElement, useId, type ReactElement } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  /** Show a subtle success affordance when the field is valid and has been touched. */
  valid?: boolean
  className?: string
  children: React.ReactNode
}

function canEnhanceFieldChild(child: ReactElement): boolean {
  if (typeof child.type === 'string') return true

  const props = child.props as Record<string, unknown>
  if ('onValueChange' in props) return false

  const typeName =
    (child.type as { displayName?: string; name?: string }).displayName ??
    (child.type as { name?: string }).name ??
    ''

  return !['Root', 'Select'].includes(typeName)
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  valid,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = htmlFor ?? generatedId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy =
    [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined

  const showSuccess = valid === true && !error
  const childCount = Children.count(children)
  let fieldContent: React.ReactNode = children

  if (childCount === 1) {
    const child = Children.only(children)
    if (isValidElement(child) && canEnhanceFieldChild(child)) {
      const childTypeName =
        (child.type as { displayName?: string; name?: string }).displayName ??
        (child.type as { name?: string }).name ??
        ''
      const isSelectField = childTypeName === 'NativeSelect'

      fieldContent = cloneElement(child as React.ReactElement<Record<string, unknown>>, {
        id: (child.props as { id?: string }).id ?? fieldId,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
        'aria-describedby': describedBy,
        className: cn(
          (child.props as { className?: string }).className,
          error && 'border-destructive focus-visible:ring-destructive/30',
          error && !isSelectField && 'pr-10',
          showSuccess && 'border-success/50 focus-visible:ring-success/20',
        ),
      })

      if (error && !isSelectField) {
        fieldContent = (
          <div className="relative">
            {fieldContent}
            <AlertCircle
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive"
              aria-hidden="true"
            />
          </div>
        )
      }
    }
  }

  return (
    <div className={cn('space-y-2', className)} data-invalid={error ? true : undefined}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required ? (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
        {showSuccess ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Valid</span>
          </span>
        ) : null}
      </div>

      {fieldContent}

      {hint && !error ? (
        <p id={hintId} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          <span>{hint}</span>
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
