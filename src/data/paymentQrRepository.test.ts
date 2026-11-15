import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calculateSession } from '../domain/sessionCalculator'
import type { SessionInput } from '../domain/session'
import { PaymentQrAccessError, latestPaymentQrSettingKey } from '../domain/paymentQr'
import { AppDatabase } from './database'
import { PaymentQrRepository } from './paymentQrRepository'
import { SessionRepository } from './sessionRepository'

const input: SessionInput = {
  playDate: '2026-08-26',
  startTime: '20:00',
  endTime: '22:00',
  note: '',
  courtCost: 240_000,
  shuttleCount: 6,
  shuttleUnitPrice: 28_000,
  shuttleSource: 'external',
  maleCount: 4,
  femaleCount: 4,
  meal: null,
}

const png = () => new Blob(['custom-payment-qr'], { type: 'image/png' })
const hashA = 'a'.repeat(64)

describe('PaymentQrRepository', () => {
  let database: AppDatabase
  let sessions: SessionRepository
  let paymentQrs: PaymentQrRepository

  beforeEach(() => {
    database = new AppDatabase(`payment-qr-${crypto.randomUUID()}`)
    sessions = new SessionRepository(database)
    paymentQrs = new PaymentQrRepository(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('lưu QR cho một buổi và chỉ áp dụng mặc định cho các buổi tạo sau', async () => {
    const oldSession = await sessions.create('owner-a', input, calculateSession(input))
    const changedSession = await sessions.create('owner-a', input, calculateSession(input))
    const record = await paymentQrs.saveForSession('owner-a', changedSession.id, png(), hashA)

    expect(await paymentQrs.getForSession('owner-a', oldSession.id)).toBeNull()
    expect(await paymentQrs.getForSession('owner-a', changedSession.id)).toMatchObject({
      id: record.id,
      ownerId: 'owner-a',
      width: 1024,
      height: 1024,
      contentHash: hashA,
    })
    expect(await paymentQrs.getLatestId('owner-a')).toBe(record.id)

    const nextSession = await sessions.create('owner-a', input, calculateSession(input))
    expect(nextSession.paymentQrId).toBe(record.id)
    expect((await sessions.get('owner-a', oldSession.id)).paymentQrId).toBeNull()
  })

  it('tái sử dụng ảnh trùng hash thay vì nhân bản Blob', async () => {
    const firstSession = await sessions.create('owner-a', input, calculateSession(input))
    const secondSession = await sessions.create('owner-a', input, calculateSession(input))
    const first = await paymentQrs.saveForSession('owner-a', firstSession.id, png(), hashA)
    const second = await paymentQrs.saveForSession('owner-a', secondSession.id, png(), hashA)

    expect(second.id).toBe(first.id)
    expect(await database.paymentQrs.count()).toBe(1)
    expect((await sessions.get('owner-a', secondSession.id)).paymentQrId).toBe(first.id)
  })

  it('cách ly QR giữa các tài khoản', async () => {
    const session = await sessions.create('owner-a', input, calculateSession(input))
    const record = await paymentQrs.saveForSession('owner-a', session.id, png(), hashA)

    await expect(paymentQrs.get('owner-b', record.id)).rejects.toBeInstanceOf(PaymentQrAccessError)
    await expect(paymentQrs.getForSession('owner-b', session.id)).rejects.toBeInstanceOf(PaymentQrAccessError)
    await expect(paymentQrs.saveForSession('owner-b', session.id, png(), 'b'.repeat(64))).rejects.toBeInstanceOf(
      PaymentQrAccessError,
    )
    expect(await paymentQrs.getLatestId('owner-b')).toBeNull()
  })

  it('rollback ảnh và setting nếu buổi chơi không tồn tại', async () => {
    await expect(paymentQrs.saveForSession('owner-a', 'missing', png(), hashA)).rejects.toThrow(
      'Không tìm thấy buổi chơi',
    )
    expect(await database.paymentQrs.count()).toBe(0)
    expect(await database.settings.get(latestPaymentQrSettingKey('owner-a'))).toBeUndefined()
  })

  it('bỏ setting hỏng khi tạo buổi mới', async () => {
    await database.settings.put({ key: latestPaymentQrSettingKey('owner-a'), value: 'missing-qr' })
    const session = await sessions.create('owner-a', input, calculateSession(input))
    expect(session.paymentQrId).toBeNull()
    expect(await database.settings.get(latestPaymentQrSettingKey('owner-a'))).toBeUndefined()
  })
})
