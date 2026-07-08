import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@/api/auth'
import { getApiErrorMessage } from '@/api/client'
import { notifyError, notifySuccess } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/design-system/FormField'
import { useAuth } from '@/context/AuthContext'

const passwordSchema = z
  .object({
    new_password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match.",
    path: ['confirm_password'],
  })

type PasswordForm = z.infer<typeof passwordSchema>

interface ForcePasswordChangeModalProps {
  open: boolean
  onSuccess: () => void
}

export function ForcePasswordChangeModal({ open, onSuccess }: ForcePasswordChangeModalProps) {
  const { logout } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    mode: 'onBlur',
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
    setIsSubmitting(true)
    mutation.mutate(values)
  }

  // Intercept the openChange to prevent clicking outside to close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Intentionally do nothing to prevent closing
      // The only way out is successfully changing password or logging out
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" hideClose>
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            For security reasons, please change your password from the default MC Number to something else before continuing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 pt-2" noValidate>
          <FormField
            label="New Password"
            htmlFor="new_password"
            error={errors.new_password?.message}
            valid={Boolean(touchedFields.new_password && !errors.new_password)}
            required
          >
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              {...register('new_password')}
            />
          </FormField>
          
          <FormField
            label="Confirm Password"
            htmlFor="confirm_password"
            error={errors.confirm_password?.message}
            valid={Boolean(touchedFields.confirm_password && !errors.confirm_password)}
            required
          >
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              {...register('confirm_password')}
            />
          </FormField>

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
