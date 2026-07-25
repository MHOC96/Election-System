import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'

interface VoteConfirmDialogProps {
  open: boolean
  candidateName: string
  candidatePhoto: string
  positionName: string
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function VoteConfirmDialog({
  open,
  candidateName,
  candidatePhoto,
  positionName,
  loading,
  onCancel,
  onConfirm,
}: VoteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm your vote</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="portal-surface portal-surface--muted flex min-w-0 items-center gap-3 rounded-xl p-3 sm:gap-4">
                <img
                  src={optimizeCloudinaryUrl(candidatePhoto, 128)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
                />
                <div className="min-w-0 text-left">
                  <p className="portal-heading break-words text-base font-semibold leading-snug">
                    {candidateName}
                  </p>
                  <p className="portal-subtle mt-0.5 text-sm">{positionName}</p>
                </div>
              </div>

              <div className="tint-warning portal-accent-soft portal-accent-border flex items-start gap-2.5 rounded-xl border p-3 text-left">
                <AlertTriangle
                  className="portal-accent-text mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="portal-body text-sm leading-relaxed">
                  Once confirmed, your choice for this position cannot be changed.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading} onClick={onCancel} className="w-full sm:w-auto">
            Go back
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className="w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {loading ? 'Submitting…' : 'Confirm vote'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
