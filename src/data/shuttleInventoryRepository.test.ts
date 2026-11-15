import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calculateSession } from '../domain/sessionCalculator'
import type { SessionInput } from '../domain/session'
import {
  ShuttleInventoryAccessError,
  ShuttleInventoryStockError,
  ShuttleInventoryValidationError,
} from '../domain/shuttleInventory'
import { AppDatabase } from './database'
import { SessionRepository } from './sessionRepository'
import { ShuttleInventoryRepository } from './shuttleInventoryRepository'

const inventoryInput = (quantity: number, price: number): SessionInput => ({
  playDate: '2026-08-26',
  startTime: '20:00',
  endTime: '22:00',
  note: '',
  courtCost: 240_000,
  shuttleCount: quantity,
  shuttleUnitPrice: price,
  shuttleSource: 'inventory',
  maleCount: 4,
  femaleCount: 4,
  meal: null,
})

describe('ShuttleInventoryRepository', () => {
  let database: AppDatabase
  let inventory: ShuttleInventoryRepository
  let sessions: SessionRepository

  beforeEach(() => {
    database = new AppDatabase(`shuttle-inventory-${crypto.randomUUID()}`)
    inventory = new ShuttleInventoryRepository(database)
    sessions = new SessionRepository(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('tính tồn kho, cầu đã đánh và giá của lần nạp mới nhất', async () => {
    const first = await inventory.restock('owner-a', 12, 28_000)
    const second = await inventory.restock('owner-a', 6, 30_000)
    await database.shuttleTransactions.update(first.id, { createdAt: '2026-08-24T10:00:00.000Z' })
    await database.shuttleTransactions.update(second.id, { createdAt: '2026-08-25T10:00:00.000Z' })

    const input = inventoryInput(7, 30_000)
    await sessions.create('owner-a', input, calculateSession(input))

    expect(await inventory.getSummary('owner-a')).toEqual({
      availableCount: 11,
      usedCount: 7,
      latestUnitPrice: 30_000,
    })
    expect((await inventory.listTransactions('owner-a')).map((item) => item.kind)).toEqual([
      'session-use',
      'restock',
      'restock',
    ])
  })

  it('sửa và xóa lần nạp khi tồn kho vẫn hợp lệ', async () => {
    const restock = await inventory.restock('owner-a', 10, 28_000)
    await inventory.updateRestock('owner-a', restock.id, 14, 29_000)
    expect(await inventory.getSummary('owner-a')).toEqual({
      availableCount: 14,
      usedCount: 0,
      latestUnitPrice: 29_000,
    })

    await inventory.deleteRestock('owner-a', restock.id)
    expect(await inventory.getSummary('owner-a')).toEqual({
      availableCount: 0,
      usedCount: 0,
      latestUnitPrice: null,
    })
  })

  it('chặn sửa hoặc xóa lần nạp nếu làm kho âm', async () => {
    const restock = await inventory.restock('owner-a', 10, 28_000)
    const input = inventoryInput(7, 28_000)
    await sessions.create('owner-a', input, calculateSession(input))

    await expect(inventory.updateRestock('owner-a', restock.id, 6, 28_000)).rejects.toBeInstanceOf(
      ShuttleInventoryStockError,
    )
    await expect(inventory.deleteRestock('owner-a', restock.id)).rejects.toBeInstanceOf(
      ShuttleInventoryStockError,
    )
    expect((await inventory.getSummary('owner-a')).availableCount).toBe(3)
  })

  it('kiểm tra dữ liệu nạp và cách ly tài khoản', async () => {
    await expect(inventory.restock('owner-a', 0, 28_000)).rejects.toBeInstanceOf(
      ShuttleInventoryValidationError,
    )
    await expect(inventory.restock('owner-a', 2.5, 28_000)).rejects.toBeInstanceOf(
      ShuttleInventoryValidationError,
    )
    await expect(inventory.restock('owner-a', 10, -1)).rejects.toBeInstanceOf(
      ShuttleInventoryValidationError,
    )

    const restock = await inventory.restock('owner-a', 10, 28_000)
    expect(await inventory.listTransactions('owner-b')).toEqual([])
    await expect(inventory.updateRestock('owner-b', restock.id, 12, 30_000)).rejects.toBeInstanceOf(
      ShuttleInventoryAccessError,
    )
    await expect(inventory.deleteRestock('owner-b', restock.id)).rejects.toBeInstanceOf(
      ShuttleInventoryAccessError,
    )
  })
})
