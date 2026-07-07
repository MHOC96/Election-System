import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Vote } from 'lucide-react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/design-system/FormField'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { CreatorFooter } from '@/components/layout/CreatorFooter'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage } from '@/api/client'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { loginSchema, type LoginForm } from '@/lib/login-schema'
import { notifyError } from '@/lib/notify'

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const cpmNumber = watch('cpm_number')
  const mcNumber = watch('mc_number')

  if (isAuthenticated && user) {
    const target = user.role === 'ADMIN' ? '/admin' : '/vote'
    return <Navigate to={target} replace />
  }

  const onSubmit = async (data: LoginForm) => {
    try {
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
        navigate('/vote')
      }
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Invalid credentials'))
    }
  }

  return (
    <div className="bg-grid relative flex min-h-[100dvh] flex-col bg-muted/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent"
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
        <Card className="w-full max-w-md animate-scale-in border shadow-lg max-sm:scroll-mt-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-md">
              <Vote className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              {isSubmitting ? 'Signing in…' : 'Member Sign In'}
            </h1>
            <CardDescription>
              {isSubmitting
                ? 'Verifying your credentials…'
                : 'Use your CPM Number and MC Number to access the election portal'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
              <FormField
                label="CPM Number"
                htmlFor="cpm_number"
                error={errors.cpm_number?.message}
                valid={Boolean(touchedFields.cpm_number && cpmNumber && !errors.cpm_number)}
                required
              >
                <Input
                  id="cpm_number"
                  placeholder="Enter CPM Number"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  enterKeyHint="next"
                  className="scroll-mt-24"
                  {...register('cpm_number')}
                />
              </FormField>
              <FormField
                label="MC Number"
                htmlFor="mc_number"
                error={errors.mc_number?.message}
                valid={Boolean(touchedFields.mc_number && mcNumber && !errors.mc_number)}
                required
              >
                <Input
                  id="mc_number"
                  type="password"
                  placeholder="Enter MC Number"
                  autoComplete="current-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  enterKeyHint="done"
                  className="scroll-mt-24"
                  {...register('mc_number')}
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

      <CreatorFooter variant="minimal" className="pb-[max(1rem,env(safe-area-inset-bottom))]" />
    </div>
  )
}
