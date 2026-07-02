import { Children, cloneElement, isValidElement, useId, type ReactElement } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
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
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = htmlFor ?? generatedId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy =
    [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined

  const childCount = Children.count(children)
  let fieldContent: React.ReactNode = children

  if (childCount === 1) {
    const child = Children.only(children)
    if (isValidElement(child) && canEnhanceFieldChild(child)) {
      fieldContent = cloneElement(child as React.ReactElement<Record<string, unknown>>, {
        id: (child.props as { id?: string }).id ?? fieldId,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
        'aria-describedby': describedBy,
      })
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {fieldContent}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
