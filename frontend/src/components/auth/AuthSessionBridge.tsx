import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AUTH_SESSION_EXPIRED_EVENT } from '@/lib/auth-events'

export function AuthSessionBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => {
      navigate('/login', { replace: true })
    }
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handler)
  }, [navigate])

  return null
}
