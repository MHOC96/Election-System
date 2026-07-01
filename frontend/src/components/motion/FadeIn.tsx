import { lazy, Suspense, type ReactNode } from 'react'

const MotionFadeIn = lazy(() => import('@/components/motion/MotionFadeIn'))

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
}

export function FadeIn({ children, className, delay, duration, y }: FadeInProps) {
  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <MotionFadeIn className={className} delay={delay} duration={duration} y={y}>
        {children}
      </MotionFadeIn>
    </Suspense>
  )
}
