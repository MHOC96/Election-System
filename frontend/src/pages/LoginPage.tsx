import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Vote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { FormField } from '@/components/design-system/FormField'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { FormErrorAlert } from '@/components/shared/FormErrorAlert'

import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { loginSchema, type LoginForm } from '@/lib/login-schema'
import { resolveApiUserMessage, type UserMessage } from '@/lib/user-messages'
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
  const submitInFlightRef = useRef(false)
  const [loginError, setLoginError] = useState<UserMessage | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: loginDefaultValues,
  })

  // Already signed in (e.g. bookmarked /login) — redirect once, not mid-submit.
  useEffect(() => {
    if (isLoading || submitInFlightRef.current || !isAuthenticated || !user) return
    navigate(user.role === 'ADMIN' ? '/admin' : '/', { replace: true })
  }, [isLoading, isAuthenticated, user, navigate])

  const cpmNumber = watch('cpm_number')
  const mcNumber = watch('mc_number')

  useEffect(() => {
    setLoginError((prev) => (prev ? null : null))
  }, [cpmNumber, mcNumber])

  if (isLoading) {
    return <PageLoader fullScreen shell />
  }

  const onSubmit = async (data: LoginForm) => {
    if (submitInFlightRef.current) return
    submitInFlightRef.current = true
    setLoginError(null)

    try {
      queryClient.clear()
      const loggedIn = await login({
        cpm_number: data.cpm_number.trim().toUpperCase(),
        mc_number: data.mc_number,
      })

      const target = loggedIn.role === 'ADMIN' ? '/admin' : '/'
      navigate(target, { replace: true })

      // Warm the portal in the background — do not block navigation after login succeeds.
      void import('@/lib/prefetch').then(({ prepareAdminEntry, prepareMemberEntry }) => {
        if (loggedIn.role === 'ADMIN') {
          void prepareAdminEntry(queryClient)
        } else {
          void prepareMemberEntry(queryClient)
        }
      })
    } catch (error) {
      setLoginError(resolveApiUserMessage(error, 'login'))
      requestAnimationFrame(() => {
        document.getElementById('login-form-error')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    } finally {
      submitInFlightRef.current = false
    }
  }

  return (
    <div className="bg-grid relative flex min-h-screen min-h-[100dvh] flex-col justify-center items-center surface-page overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent dark:from-primary/[0.12]"
      />
      <SkipToContent />

      <header className="absolute right-3 top-3 z-10 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] sm:right-4 sm:top-4">
        <ThemeToggle />
      </header>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="relative flex w-full flex-1 flex-col items-center justify-center p-4 py-3 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none"
      >
        <Card className="surface-raised w-full max-w-sm sm:max-w-md animate-scale-in">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3 text-center">
            <div className={cn(brandMarkClass, 'mx-auto mb-2 sm:mb-3 h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl shadow-md')}>
              <Vote className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight">
              {isSubmitting ? 'Signing in…' : 'Member Sign In'}
            </h1>
            <CardDescription className="mt-1 sm:mt-1.5 text-xs sm:text-sm">
              {isSubmitting
                ? 'Verifying your credentials…'
                : 'Sign in with your CPM Number to access the election portal.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 sm:p-6 sm:pt-0">
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3 sm:space-y-4" noValidate>
              {loginError ? <FormErrorAlert id="login-form-error" message={loginError} /> : null}
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
                      disabled={isSubmitting}
                      className="h-10 text-sm sm:h-11 sm:text-base scroll-mt-24"
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
                hint="First-time sign-in: enter your MC Number."
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
                      disabled={isSubmitting}
                      className="h-10 text-sm sm:h-11 sm:text-base scroll-mt-24"
                    />
                  )}
                />
              </FormField>
              <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base mt-1 sm:mt-2" disabled={isSubmitting} aria-busy={isSubmitting}>
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
