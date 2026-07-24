import type { ReactNode } from 'react'
import {
  memberSectionHeaderRowClass,
  memberSectionHeadingClass,
  memberSectionIntroClass,
  memberSectionStackClass,
} from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface MemberSectionProps {
  id?: string
  title: string
  description?: string
  badge?: ReactNode
  children: ReactNode
  className?: string
}

export function MemberSection({
  id,
  title,
  description,
  badge,
  children,
  className,
}: MemberSectionProps) {
  const headingId = id ? `${id}-heading` : undefined

  return (
    <section aria-labelledby={headingId} className={cn(memberSectionStackClass, className)}>
      <div className={memberSectionHeaderRowClass}>
        <div className="min-w-0">
          <h2 id={headingId} className={memberSectionHeadingClass}>
            {title}
          </h2>
          {description ? <p className={memberSectionIntroClass}>{description}</p> : null}
        </div>
        {badge ? <div className="w-fit shrink-0 self-start sm:self-center">{badge}</div> : null}
      </div>
      {children}
    </section>
  )
}
