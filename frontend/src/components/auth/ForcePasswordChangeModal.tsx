import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { changePassword } from '@/api/auth'
import { getApiErrorMessage } from '@/api/client'
import { notifyError, notifySuccess } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const passwordFieldSchema = z.object({
  current_password: z.string().min(1, 'Current password is required.'),
  new_password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirm_password: z.string().min(1, 'Please confirm your new password.'),
})

type PasswordForm = z.infer<typeof passwordFieldSchema>

function validatePasswordChange(values: PasswordForm): Partial<Record<keyof PasswordForm, string>> {
  const errors: Partial<Record<keyof PasswordForm, string>> = {}

  if (values.new_password === values.current_password) {
    errors.new_password = 'New password must be different from your current password.'
  }

  if (values.new_password !== values.confirm_password) {
    errors.confirm_password = "Passwords don't match."
  }

  return errors
}

interface PasswordFieldProps {
  id: string
  label: string
  hint?: string
  placeholder?: string
  error?: string
  required?: boolean
  autoComplete?: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
}

function PasswordField({
  id,
  label,
  hint,
  placeholder = 'Enter password',
  error,
  required,
  autoComplete,
  value,
  onChange,
  onBlur,
  name,
}: PasswordFieldProps) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-2" data-invalid={error ? true : undefined}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      <PasswordInput
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-required={required ? true : undefined}
        aria-describedby={describedBy}
        className={cn(error && 'border-destructive focus-visible:ring-destructive/30')}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

interface ForcePasswordChangeModalProps {
  open: boolean
  onSuccess: () => void
}

export function ForcePasswordChangeModal({ open, onSuccess }: ForcePasswordChangeModalProps) {
  const { logout } = useAuth()
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordFieldSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      notifySuccess('Password changed successfully!')
      onSuccess()
    },
    onError: (error) => notifyError(getApiErrorMessage(error)),
    onSettled: () => setIsSubmitting(false),
  })

  const onSubmit = (values: PasswordForm) => {
    clearErrors()
    const crossFieldErrors = validatePasswordChange(values)
    const errorEntries = Object.entries(crossFieldErrors) as Array<[keyof PasswordForm, string]>

    if (errorEntries.length > 0) {
      errorEntries.forEach(([field, message]) => {
        setError(field, { type: 'manual', message })
      })
      return
    }

    setIsSubmitting(true)
    mutation.mutate(values)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Intentionally do nothing to prevent closing
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" hideClose>
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            For security, change your password before continuing. If you have not changed it yet, your current password is your MC Number.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 pt-2" noValidate>
          <Controller
            name="current_password"
            control={control}
            render={({ field }) => (
              <PasswordField
                id="current_password"
                label="Current Password"
                hint="Enter your MC Number if you have not changed your password yet."
                error={errors.current_password?.message}
                required
                autoComplete="current-password"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Controller
            name="new_password"
            control={control}
            render={({ field }) => (
              <PasswordField
                id="new_password"
                label="New Password"
                placeholder="Enter new password"
                error={errors.new_password?.message}
                required
                autoComplete="new-password"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Controller
            name="confirm_password"
            control={control}
            render={({ field }) => (
              <PasswordField
                id="confirm_password"
                label="Confirm Password"
                placeholder="Confirm new password"
                error={errors.confirm_password?.message}
                required
                autoComplete="new-password"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void logout()}
              disabled={isSubmitting}
            >
              Log out
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
