import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface MotionFadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
}

export default function MotionFadeIn({
  children,
  className,
  delay = 0,
  duration = 0.25,
  y = 12,
}: MotionFadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
