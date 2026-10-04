import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AUTH_SESSION_EXPIRED_EVENT } from '@/lib/auth-events'
import { resetConsoleWarmupState } from '@/lib/prefetch'

export function AuthSessionBridge() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const handler = () => {
      queryClient.clear()
      resetConsoleWarmupState()
      navigate('/login', { replace: true })
    }
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handler)
  }, [navigate, queryClient])

  return null
}
