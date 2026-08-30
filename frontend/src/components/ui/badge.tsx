import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors shadow-[inset_0_1px_0_hsl(0_0%_100%/0.4)] dark:shadow-none [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary text-primary-foreground shadow-none',
        secondary: 'border-border/60 bg-secondary text-secondary-foreground',
        destructive:
          'border-destructive/25 bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/20',
        outline: 'border-border/70 bg-card/50 text-foreground',
        success: 'border-success/25 bg-success/12 text-success ring-1 ring-inset ring-success/20',
        warning: 'border-warning/25 bg-warning/12 text-warning ring-1 ring-inset ring-warning/22',
        muted: 'border-transparent bg-muted text-muted-foreground shadow-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
