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
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm your vote</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3">
                <img
                  src={optimizeCloudinaryUrl(candidatePhoto, 128)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 text-left">
                  <p className="font-semibold text-foreground">{candidateName}</p>
                  <p className="text-sm text-muted-foreground">{positionName}</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-muted bg-muted/40 p-3 text-left">
                <p className="text-sm text-foreground">
                  Once confirmed, your choice for this position cannot be changed.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={onCancel}>
            Go back
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
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
