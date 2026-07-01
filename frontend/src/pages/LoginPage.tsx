import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FadeIn } from '@/components/motion/FadeIn'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { Loader2, Vote } from 'lucide-react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/design-system/FormField'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage } from '@/api/client'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { loginSchema, type LoginForm } from '@/lib/form-schemas'
import {
  prefetchAdminLanding,
  prefetchMemberLanding,
  warmAdminLanding,
  warmMemberLanding,
} from '@/lib/prefetch'
import { toast } from 'sonner'

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reduceMotion = usePrefersReducedMotion()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

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

      if (loggedIn.role === 'ADMIN') {
        prefetchAdminLanding(queryClient)
        warmAdminLanding()
        navigate('/admin')
      } else {
        prefetchMemberLanding(queryClient)
        warmMemberLanding()
        navigate('/vote')
      }

      toast.success('Welcome back!')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid credentials'))
    }
  }

  const loginCard = (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          <Vote className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Sign in</h1>
        <CardDescription>Use your CPM Number and MC Number to access the election portal</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
          <FormField label="CPM Number" htmlFor="cpm_number" error={errors.cpm_number?.message} required>
            <Input
              id="cpm_number"
              placeholder="Enter CPM Number"
              autoComplete="username"
              autoCapitalize="characters"
              {...register('cpm_number')}
            />
          </FormField>
          <FormField label="MC Number" htmlFor="mc_number" error={errors.mc_number?.message} required>
            <Input
              id="mc_number"
              type="password"
              placeholder="Enter MC Number"
              autoComplete="current-password"
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
  )

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SkipToContent />

      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex flex-1 flex-col items-center justify-center px-4 py-8 outline-none"
      >
        {reduceMotion ? (
          loginCard
        ) : (
          <FadeIn className="w-full max-w-md" duration={0.25}>
            {loginCard}
          </FadeIn>
        )}
      </main>
    </div>
  )
}
