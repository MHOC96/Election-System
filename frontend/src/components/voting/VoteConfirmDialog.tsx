import { AlertTriangle } from 'lucide-react'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
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
              <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-left" role="alert">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <p className="text-sm text-foreground">
                  <strong className="font-semibold">This cannot be changed.</strong> Your vote is
                  recorded once per position and is irreversible.
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
