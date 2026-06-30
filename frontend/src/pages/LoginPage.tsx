import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, Vote } from 'lucide-react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage } from '@/api/client'
import { toast } from 'sonner'

const loginSchema = z.object({
  cpm_number: z.string().min(1, 'CPM Number is required'),
  mc_number: z.string().min(1, 'MC Number is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

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
      toast.success('Welcome back!')
      navigate(loggedIn.role === 'ADMIN' ? '/admin' : '/vote')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid credentials'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Vote className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Executive Committee Election</CardTitle>
            <CardDescription>Sign in with your CPM Number and MC Number</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpm_number">CPM Number</Label>
                <Input
                  id="cpm_number"
                  placeholder="Enter CPM Number"
                  autoComplete="username"
                  {...register('cpm_number')}
                />
                {errors.cpm_number && (
                  <p className="text-sm text-destructive">{errors.cpm_number.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc_number">MC Number</Label>
                <Input
                  id="mc_number"
                  type="password"
                  placeholder="Enter MC Number"
                  autoComplete="current-password"
                  {...register('mc_number')}
                />
                {errors.mc_number && (
                  <p className="text-sm text-destructive">{errors.mc_number.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
