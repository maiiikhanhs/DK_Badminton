export const PAYMENT_QR_SIZE = 1024
export const PAYMENT_QR_MAX_FILE_SIZE = 10 * 1024 * 1024
export const PAYMENT_QR_MIN_SOURCE_SIZE = 256

export const PAYMENT_QR_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export type PaymentQrRecord = {
  id: string
  ownerId: string
  imageBlob: Blob
  mimeType: 'image/png'
  width: typeof PAYMENT_QR_SIZE
  height: typeof PAYMENT_QR_SIZE
  contentHash: string
  createdAt: string
  updatedAt: string
}

export const latestPaymentQrSettingKey = (ownerId: string) => `latestPaymentQrId:${ownerId}`

export class PaymentQrNotFoundError extends Error {
  constructor(message = 'Không tìm thấy QR nhận tiền.') {
    super(message)
    this.name = 'PaymentQrNotFoundError'
  }
}

export class PaymentQrAccessError extends Error {
  constructor() {
    super('Bạn không có quyền sử dụng QR nhận tiền này.')
    this.name = 'PaymentQrAccessError'
  }
}

export class PaymentQrValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentQrValidationError'
  }
}
