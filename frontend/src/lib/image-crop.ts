import type { Area } from 'react-easy-crop'

const MAX_OUTPUT_SIZE = 512
const JPEG_QUALITY = 0.82

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Failed to load image')))
    image.src = src
  })
}

export async function cropImageToFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName = 'candidate-photo.jpg',
): Promise<File> {
  const image = await loadImage(imageSrc)
  const cropSize = Math.min(pixelCrop.width, pixelCrop.height)
  const outputSize = Math.min(MAX_OUTPUT_SIZE, Math.round(cropSize))

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare image canvas')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Failed to process image'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })

  return new File([blob], fileName.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
}

export function readFileAsObjectUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read image'))
    })
    reader.addEventListener('error', () => reject(new Error('Failed to read image')))
    reader.readAsDataURL(file)
  })
}
