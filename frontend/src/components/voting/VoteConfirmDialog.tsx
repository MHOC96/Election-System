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
            <div className="space-y-4 pt-2">
              <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-muted/30 p-3 sm:gap-4">
                <img
                  src={optimizeCloudinaryUrl(candidatePhoto, 128)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
                />
                <div className="min-w-0 text-left">
                  <p className="break-words font-semibold text-foreground">{candidateName}</p>
                  <p className="text-sm text-muted-foreground">{positionName}</p>
                </div>
              </div>
              <div className="rounded-lg border border-muted bg-muted/40 p-3 text-left">
                <p className="text-sm text-foreground">
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
            {loading ? 'Submitting...' : 'Confirm vote'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
