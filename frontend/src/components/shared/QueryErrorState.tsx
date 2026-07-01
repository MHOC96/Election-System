import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

interface QueryErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  isRetrying?: boolean
}

export function QueryErrorState({
  title = 'Failed to load data',
  description = 'Something went wrong while fetching. Check your connection and try again.',
  onRetry,
  isRetrying,
}: QueryErrorStateProps) {
  return (
    <EmptyState icon={RefreshCw} title={title} description={description}>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Try again'}
        </Button>
      ) : null}
    </EmptyState>
  )
}
