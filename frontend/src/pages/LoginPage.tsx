import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Vote } from 'lucide-react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { FormField } from '@/components/design-system/FormField'
import { SkipToContent } from '@/components/shared/SkipToContent'

import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { loginSchema, type LoginForm } from '@/lib/login-schema'
import { notifyApiError } from '@/lib/notify'
import { brandMarkClass } from '@/lib/design-tokens'
import { PageLoader } from '@/components/shared/PageLoader'
import { cn } from '@/lib/utils'

const loginDefaultValues: LoginForm = {
  cpm_number: '',
  mc_number: '',
}

export function LoginPage() {
  const { login, isAuthenticated, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: loginDefaultValues,
  })

  if (isLoading) {
    return <PageLoader fullScreen shell />
  }

  if (isAuthenticated && user) {
    const target = user.role === 'ADMIN' ? '/admin' : '/'
    return <Navigate to={target} replace />
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      queryClient.clear()
      const loggedIn = await login({
        cpm_number: data.cpm_number.trim().toUpperCase(),
        mc_number: data.mc_number,
      })

      const { prepareAdminEntry, prepareMemberEntry } = await import('@/lib/prefetch')

      if (loggedIn.role === 'ADMIN') {
        await prepareAdminEntry(queryClient)
        navigate('/admin')
      } else {
        await prepareMemberEntry(queryClient)
        navigate('/')
      }
    } catch (error) {
      notifyApiError(error, 'login')
    }
  }

  return (
    <div className="bg-grid relative flex min-h-[100dvh] flex-col surface-page">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent dark:from-primary/[0.12]"
      />
      <SkipToContent />

      <header className="relative flex justify-end p-4">
        <ThemeToggle />
      </header>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="relative flex flex-1 flex-col items-center justify-start px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 outline-none sm:justify-center sm:py-8"
      >
        <Card className="surface-raised w-full max-w-md animate-scale-in max-sm:scroll-mt-4">
          <CardHeader className="text-center">
            <div className={cn(brandMarkClass, 'mx-auto mb-3 h-14 w-14 rounded-2xl shadow-md')}>
              <Vote className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              {isSubmitting ? 'Signing in…' : 'Member Sign In'}
            </h1>
            <CardDescription>
              {isSubmitting
                ? 'Verifying your credentials…'
                : 'Sign in with your CPM Number. On your first login, use your MC Number as your password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
              <FormField
                label="CPM Number"
                htmlFor="cpm_number"
                error={errors.cpm_number?.message}
                valid={Boolean(touchedFields.cpm_number && !errors.cpm_number)}
                required
              >
                <Controller
                  name="cpm_number"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="cpm_number"
                      placeholder="Enter CPM Number"
                      autoComplete="username"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      enterKeyHint="next"
                      className="scroll-mt-24"
                    />
                  )}
                />
              </FormField>
              <FormField
                label="Password"
                htmlFor="mc_number"
                error={errors.mc_number?.message}
                valid={Boolean(touchedFields.mc_number && !errors.mc_number)}
                required
                hint="First-time sign-in: enter your MC Number. After changing your password, use the new password here."
              >
                <Controller
                  name="mc_number"
                  control={control}
                  render={({ field }) => (
                    <PasswordInput
                      {...field}
                      id="mc_number"
                      autoComplete="current-password"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      enterKeyHint="done"
                      className="scroll-mt-24"
                    />
                  )}
                />
              </FormField>
              <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>


    </div>
  )
}
