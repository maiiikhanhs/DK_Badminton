import {
  PAYMENT_QR_ALLOWED_TYPES,
  PAYMENT_QR_MAX_FILE_SIZE,
  PAYMENT_QR_MIN_SOURCE_SIZE,
  PAYMENT_QR_SIZE,
  PaymentQrValidationError,
} from '../domain/paymentQr'

export type CropTransform = {
  offsetX: number
  offsetY: number
  zoom: number
}

export type PaymentQrSource = {
  image: HTMLImageElement
  url: string
  width: number
  height: number
}

export const getCoverScale = (imageWidth: number, imageHeight: number, frameSize: number) =>
  Math.max(frameSize / imageWidth, frameSize / imageHeight)

export const clampCropTransform = (
  transform: CropTransform,
  imageWidth: number,
  imageHeight: number,
  frameSize: number,
): CropTransform => {
  const zoom = Math.min(5, Math.max(1, transform.zoom))
  const scale = getCoverScale(imageWidth, imageHeight, frameSize) * zoom
  const maxOffsetX = Math.max(0, (imageWidth * scale - frameSize) / 2)
  const maxOffsetY = Math.max(0, (imageHeight * scale - frameSize) / 2)
  return {
    zoom,
    offsetX: maxOffsetX === 0 ? 0 : Math.min(maxOffsetX, Math.max(-maxOffsetX, transform.offsetX)),
    offsetY: maxOffsetY === 0 ? 0 : Math.min(maxOffsetY, Math.max(-maxOffsetY, transform.offsetY)),
  }
}

export const validatePaymentQrFile = (file: File) => {
  if (!PAYMENT_QR_ALLOWED_TYPES.includes(file.type as (typeof PAYMENT_QR_ALLOWED_TYPES)[number])) {
    throw new PaymentQrValidationError('Chỉ được chọn ảnh PNG, JPEG hoặc WebP.')
  }
  if (file.size > PAYMENT_QR_MAX_FILE_SIZE) {
    throw new PaymentQrValidationError('Ảnh QR không được lớn hơn 10 MB.')
  }
  if (file.size === 0) throw new PaymentQrValidationError('Ảnh QR không có dữ liệu.')
}

export const loadPaymentQrSource = async (file: File): Promise<PaymentQrSource> => {
  validatePaymentQrFile(file)
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new PaymentQrValidationError('Không thể đọc ảnh QR đã chọn.'))
      image.src = url
    })
    if (image.naturalWidth < PAYMENT_QR_MIN_SOURCE_SIZE || image.naturalHeight < PAYMENT_QR_MIN_SOURCE_SIZE) {
      throw new PaymentQrValidationError('Ảnh QR phải có kích thước tối thiểu 256 × 256 px.')
    }
    return { image, url, width: image.naturalWidth, height: image.naturalHeight }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

export const createPaymentQrPng = (
  source: PaymentQrSource,
  frameSize: number,
  transform: CropTransform,
): Promise<Blob> => {
  const safeTransform = clampCropTransform(transform, source.width, source.height, frameSize)
  const scale = getCoverScale(source.width, source.height, frameSize) * safeTransform.zoom
  const outputRatio = PAYMENT_QR_SIZE / frameSize
  const canvas = document.createElement('canvas')
  canvas.width = PAYMENT_QR_SIZE
  canvas.height = PAYMENT_QR_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new PaymentQrValidationError('Thiết bị không thể xử lý ảnh QR.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.setTransform(
    scale * outputRatio,
    0,
    0,
    scale * outputRatio,
    (frameSize / 2 + safeTransform.offsetX) * outputRatio,
    (frameSize / 2 + safeTransform.offsetY) * outputRatio,
  )
  context.drawImage(source.image, -source.width / 2, -source.height / 2)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new PaymentQrValidationError('Không thể xuất ảnh QR.')),
      'image/png',
    )
  })
}

export const hashPaymentQrBlob = async (blob: Blob) => {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
