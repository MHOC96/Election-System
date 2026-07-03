import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Loader2, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cropImageToFile } from '@/lib/image-crop'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'

interface PhotoCropDialogProps {
  open: boolean
  imageSrc: string | null
  onCancel: () => void
  onConfirm: (file: File) => Promise<void>
}

export function PhotoCropDialog({ open, imageSrc, onCancel, onConfirm }: PhotoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleClose = () => {
    if (processing) return
    onCancel()
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setProcessing(true)
    try {
      const file = await cropImageToFile(imageSrc, croppedAreaPixels)
      await onConfirm(file)
      onCancel()
    } finally {
      setProcessing(false)
      requestAnimationFrame(() => restoreBodyPointerEvents())
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop profile photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative h-64 overflow-hidden rounded-lg bg-muted">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Zoom"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Drag to reposition. The image is compressed before upload for faster saving.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={processing || !imageSrc}>
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              'Use photo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
