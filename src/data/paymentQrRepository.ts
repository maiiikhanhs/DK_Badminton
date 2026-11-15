import type { AppDatabase } from './database'
import {
  PAYMENT_QR_SIZE,
  PaymentQrAccessError,
  PaymentQrNotFoundError,
  PaymentQrValidationError,
  latestPaymentQrSettingKey,
  type PaymentQrRecord,
} from '../domain/paymentQr'

const isSha256 = (value: string) => /^[a-f0-9]{64}$/i.test(value)

export class PaymentQrRepository {
  private readonly database: AppDatabase

  constructor(database: AppDatabase) {
    this.database = database
  }

  async get(ownerId: string, paymentQrId: string): Promise<PaymentQrRecord> {
    const record = await this.database.paymentQrs.get(paymentQrId)
    if (!record) throw new PaymentQrNotFoundError()
    if (record.ownerId !== ownerId) throw new PaymentQrAccessError()
    return record
  }

  async getForSession(ownerId: string, sessionId: string): Promise<PaymentQrRecord | null> {
    const session = await this.database.sessions.get(sessionId)
    if (!session) throw new PaymentQrNotFoundError('Không tìm thấy buổi chơi để đọc QR.')
    if (session.ownerId !== ownerId) throw new PaymentQrAccessError()
    return session.paymentQrId ? this.get(ownerId, session.paymentQrId) : null
  }

  async getLatestId(ownerId: string): Promise<string | null> {
    const setting = await this.database.settings.get(latestPaymentQrSettingKey(ownerId))
    if (!setting?.value) return null
    const record = await this.database.paymentQrs.get(setting.value)
    return record?.ownerId === ownerId ? record.id : null
  }

  async saveForSession(
    ownerId: string,
    sessionId: string,
    imageBlob: Blob,
    contentHash: string,
  ): Promise<PaymentQrRecord> {
    if (imageBlob.type !== 'image/png' || imageBlob.size === 0) {
      throw new PaymentQrValidationError('Ảnh QR sau khi căn chỉnh phải là PNG hợp lệ.')
    }
    if (!isSha256(contentHash)) throw new PaymentQrValidationError('Mã kiểm tra ảnh QR không hợp lệ.')

    return this.database.transaction(
      'rw',
      this.database.paymentQrs,
      this.database.sessions,
      this.database.settings,
      async () => {
        const session = await this.database.sessions.get(sessionId)
        if (!session) throw new PaymentQrNotFoundError('Không tìm thấy buổi chơi để lưu QR.')
        if (session.ownerId !== ownerId) throw new PaymentQrAccessError()

        const existing = await this.database.paymentQrs
          .where('[ownerId+contentHash]')
          .equals([ownerId, contentHash])
          .first()
        const now = new Date().toISOString()
        const record: PaymentQrRecord = existing ?? {
          id: crypto.randomUUID(),
          ownerId,
          imageBlob,
          mimeType: 'image/png',
          width: PAYMENT_QR_SIZE,
          height: PAYMENT_QR_SIZE,
          contentHash,
          createdAt: now,
          updatedAt: now,
        }
        if (!existing) await this.database.paymentQrs.add(record)

        await this.database.sessions.update(sessionId, { paymentQrId: record.id, updatedAt: now })
        await this.database.settings.put({ key: latestPaymentQrSettingKey(ownerId), value: record.id })
        return record
      },
    )
  }
}
