import type { AppDatabase } from './database'
import { summarizeShuttleTransactions } from './shuttleInventoryRepository'
import {
  CALCULATION_RULE_VERSION,
  MALE_SURCHARGE,
  ROUNDING_UNIT,
  type BadmintonSession,
  type SessionCalculation,
  type SessionInput,
} from '../domain/session'
import {
  ShuttleInventoryPriceError,
  ShuttleInventoryStockError,
  type ShuttleInventoryTransaction,
} from '../domain/shuttleInventory'
import { latestPaymentQrSettingKey } from '../domain/paymentQr'

export class SessionNotFoundError extends Error {
  constructor() {
    super('Không tìm thấy buổi chơi.')
    this.name = 'SessionNotFoundError'
  }
}

export class SessionAccessError extends Error {
  constructor() {
    super('Bạn không có quyền truy cập buổi chơi này.')
    this.name = 'SessionAccessError'
  }
}

export class SessionRepository {
  private readonly database: AppDatabase

  constructor(database: AppDatabase) {
    this.database = database
  }

  async list(ownerId: string): Promise<BadmintonSession[]> {
    const sessions = await this.database.sessions.where('ownerId').equals(ownerId).toArray()
    return sessions.sort(
      (left, right) =>
        right.playDate.localeCompare(left.playDate) || right.updatedAt.localeCompare(left.updatedAt),
    )
  }

  async get(ownerId: string, sessionId: string): Promise<BadmintonSession> {
    const session = await this.database.sessions.get(sessionId)
    if (!session) throw new SessionNotFoundError()
    if (session.ownerId !== ownerId) throw new SessionAccessError()
    return session
  }

  async create(
    ownerId: string,
    input: SessionInput,
    calculation: SessionCalculation,
  ): Promise<BadmintonSession> {
    const now = new Date().toISOString()
    const session: BadmintonSession = {
      id: crypto.randomUUID(),
      ownerId,
      paymentQrId: null,
      ...input,
      note: input.note.trim(),
      ...calculation,
      ruleVersion: CALCULATION_RULE_VERSION,
      maleSurcharge: MALE_SURCHARGE,
      roundingUnit: ROUNDING_UNIT,
      createdAt: now,
      updatedAt: now,
    }
    await this.database.transaction(
      'rw',
      this.database.sessions,
      this.database.shuttleTransactions,
      this.database.paymentQrs,
      this.database.settings,
      async () => {
        const latestQrSetting = await this.database.settings.get(latestPaymentQrSettingKey(ownerId))
        if (latestQrSetting?.value) {
          const latestQr = await this.database.paymentQrs.get(latestQrSetting.value)
          if (latestQr?.ownerId === ownerId) session.paymentQrId = latestQr.id
          else await this.database.settings.delete(latestPaymentQrSettingKey(ownerId))
        }
        await this.addInventoryUsage(ownerId, session.id, input, now, undefined, true)
        await this.database.sessions.add(session)
      },
    )
    return session
  }

  async update(
    ownerId: string,
    sessionId: string,
    input: SessionInput,
    calculation: SessionCalculation,
  ): Promise<BadmintonSession> {
    return this.database.transaction(
      'rw',
      this.database.sessions,
      this.database.shuttleTransactions,
      async () => {
        const existing = await this.getOwned(ownerId, sessionId)
        const previousUsage = await this.database.shuttleTransactions.where('sessionId').equals(sessionId).first()
        if (previousUsage) await this.database.shuttleTransactions.delete(previousUsage.id)

        const movingIntoInventory = existing.shuttleSource !== 'inventory' && input.shuttleSource === 'inventory'
        if (
          existing.shuttleSource === 'inventory' &&
          input.shuttleSource === 'inventory' &&
          input.shuttleUnitPrice !== existing.shuttleUnitPrice
        ) {
          throw new ShuttleInventoryPriceError()
        }

        const now = new Date().toISOString()
        await this.addInventoryUsage(
          ownerId,
          sessionId,
          input,
          now,
          existing.shuttleSource === 'inventory' ? previousUsage : undefined,
          movingIntoInventory,
        )

        const updated: BadmintonSession = {
          ...existing,
          ...input,
          note: input.note.trim(),
          ...calculation,
          ruleVersion: CALCULATION_RULE_VERSION,
          maleSurcharge: MALE_SURCHARGE,
          roundingUnit: ROUNDING_UNIT,
          updatedAt: now,
        }
        await this.database.sessions.put(updated)
        return updated
      },
    )
  }

  async delete(ownerId: string, sessionId: string): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.sessions,
      this.database.shuttleTransactions,
      async () => {
        await this.getOwned(ownerId, sessionId)
        await this.database.shuttleTransactions.where('sessionId').equals(sessionId).delete()
        await this.database.sessions.delete(sessionId)
      },
    )
  }

  private async getOwned(ownerId: string, sessionId: string): Promise<BadmintonSession> {
    const session = await this.database.sessions.get(sessionId)
    if (!session) throw new SessionNotFoundError()
    if (session.ownerId !== ownerId) throw new SessionAccessError()
    return session
  }

  private async addInventoryUsage(
    ownerId: string,
    sessionId: string,
    input: SessionInput,
    now: string,
    previousUsage?: ShuttleInventoryTransaction,
    requireLatestPrice = false,
  ) {
    if (input.shuttleSource !== 'inventory') return

    const transactions = await this.database.shuttleTransactions.where('ownerId').equals(ownerId).toArray()
    const summary = summarizeShuttleTransactions(transactions)
    if (summary.latestUnitPrice === null) {
      throw new ShuttleInventoryStockError('Kho chưa có cầu. Hãy nạp cầu trước khi lưu buổi chơi.', 0)
    }
    if (requireLatestPrice && input.shuttleUnitPrice !== summary.latestUnitPrice) {
      throw new ShuttleInventoryPriceError()
    }
    if (input.shuttleCount > summary.availableCount) {
      throw new ShuttleInventoryStockError(
        `Kho chỉ còn ${summary.availableCount} quả, không đủ ${input.shuttleCount} quả cho buổi chơi.`,
        summary.availableCount,
      )
    }
    if (input.shuttleCount === 0) return

    await this.database.shuttleTransactions.add({
      id: previousUsage?.id ?? crypto.randomUUID(),
      ownerId,
      kind: 'session-use',
      quantityDelta: -input.shuttleCount,
      unitPrice: input.shuttleUnitPrice,
      sessionId,
      createdAt: previousUsage?.createdAt ?? now,
      updatedAt: now,
    })
  }
}
