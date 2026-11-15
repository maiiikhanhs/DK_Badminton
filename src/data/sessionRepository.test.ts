import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calculateSession } from '../domain/sessionCalculator'
import { CALCULATION_RULE_VERSION, MALE_SURCHARGE, type SessionCalculation, type SessionInput } from '../domain/session'
import { ShuttleInventoryPriceError, ShuttleInventoryStockError } from '../domain/shuttleInventory'
import { AppDatabase } from './database'
import { SessionAccessError, SessionRepository } from './sessionRepository'
import { ShuttleInventoryRepository } from './shuttleInventoryRepository'

const baseInput: SessionInput = {
  playDate: '2026-08-19',
  startTime: '21:30',
  endTime: '22:30',
  note: 'Ca tối',
  courtCost: 240_000,
  shuttleCount: 6,
  shuttleUnitPrice: 30_000,
  shuttleSource: 'external',
  maleCount: 4,
  femaleCount: 3,
  meal: null,
}

describe('SessionRepository', () => {
  let database: AppDatabase
  let repository: SessionRepository

  beforeEach(() => {
    database = new AppDatabase(`session-repository-${crypto.randomUUID()}`)
    repository = new SessionRepository(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('tạo, đọc, sửa và xóa buổi chơi', async () => {
    const created = await repository.create('owner-a', baseInput, calculateSession(baseInput))
    expect(await repository.get('owner-a', created.id)).toMatchObject({
      note: 'Ca tối',
      startTime: '21:30',
      endTime: '22:30',
      ruleVersion: CALCULATION_RULE_VERSION,
      maleSurcharge: MALE_SURCHARGE,
    })

    const editedInput = { ...baseInput, note: 'Đã đổi sân', endTime: '23:00', courtCost: 260_000 }
    const updated = await repository.update('owner-a', created.id, editedInput, calculateSession(editedInput))
    expect(updated).toMatchObject({ note: 'Đã đổi sân', endTime: '23:00', totalCost: 440_000 })

    await repository.delete('owner-a', created.id)
    await expect(repository.get('owner-a', created.id)).rejects.toThrow('Không tìm thấy')
  })

  it('giữ snapshot version 1 khi đọc và chuyển sang version 3 khi sửa', async () => {
    const created = await repository.create('owner-a', baseInput, calculateSession(baseInput))
    await database.sessions.update(created.id, {
      ruleVersion: 1,
      maleSurcharge: 20_000,
      femaleFee: 49_000,
      maleFee: 69_000,
      totalCollected: 423_000,
      surplus: 3_000,
    })

    expect(await repository.get('owner-a', created.id)).toMatchObject({
      ruleVersion: 1,
      maleSurcharge: 20_000,
      femaleFee: 49_000,
      maleFee: 69_000,
    })

    const updated = await repository.update('owner-a', created.id, baseInput, calculateSession(baseInput))
    expect(updated).toMatchObject({
      ruleVersion: 3,
      maleSurcharge: 15_000,
      femaleFee: 52_000,
      maleFee: 67_000,
    })
  })

  it('lưu và sửa snapshot tiền ăn cùng buổi chơi', async () => {
    const mealInput = { ...baseInput, meal: { cost: 500_000, maleCount: 2, femaleCount: 3 } }
    const created = await repository.create('owner-a', mealInput, calculateSession(mealInput))
    expect(created).toMatchObject({
      totalCost: 920_000,
      meal: { cost: 500_000, peopleCount: 5, perPersonFee: 100_000, totalCollected: 500_000 },
    })

    const withoutMeal = await repository.update('owner-a', created.id, baseInput, calculateSession(baseInput))
    expect(withoutMeal).toMatchObject({ totalCost: 420_000, meal: null })
  })

  it('cách ly dữ liệu giữa các tài khoản', async () => {
    const created = await repository.create('owner-a', baseInput, calculateSession(baseInput))
    expect(await repository.list('owner-b')).toHaveLength(0)
    await expect(repository.get('owner-b', created.id)).rejects.toBeInstanceOf(SessionAccessError)
    await expect(repository.delete('owner-b', created.id)).rejects.toBeInstanceOf(SessionAccessError)
  })

  it('sắp xếp ngày mới trước, rồi thời gian cập nhật mới trước', async () => {
    const older = { ...baseInput, playDate: '2026-08-18' }
    const newer = { ...baseInput, playDate: '2026-08-20' }
    await repository.create('owner-a', older, calculateSession(older))
    await repository.create('owner-a', newer, calculateSession(newer))
    expect((await repository.list('owner-a')).map((item) => item.playDate)).toEqual(['2026-08-20', '2026-08-18'])
  })

  it('tạo, sửa và xóa buổi dùng kho sẽ trừ, điều chỉnh và hoàn cầu', async () => {
    const inventory = new ShuttleInventoryRepository(database)
    await inventory.restock('owner-a', 12, 28_000)
    const inventoryInput: SessionInput = {
      ...baseInput,
      shuttleSource: 'inventory',
      shuttleCount: 7,
      shuttleUnitPrice: 28_000,
    }

    const created = await repository.create('owner-a', inventoryInput, calculateSession(inventoryInput))
    expect(await inventory.getSummary('owner-a')).toMatchObject({ availableCount: 5, usedCount: 7 })

    const fewerShuttles = { ...inventoryInput, shuttleCount: 5 }
    await repository.update('owner-a', created.id, fewerShuttles, calculateSession(fewerShuttles))
    expect(await inventory.getSummary('owner-a')).toMatchObject({ availableCount: 7, usedCount: 5 })

    await repository.delete('owner-a', created.id)
    expect(await inventory.getSummary('owner-a')).toMatchObject({ availableCount: 12, usedCount: 0 })
    expect(await database.shuttleTransactions.where('sessionId').equals(created.id).count()).toBe(0)
  })

  it('chuyển đổi nguồn cầu đúng và giữ snapshot giá của buổi lấy từ kho', async () => {
    const inventory = new ShuttleInventoryRepository(database)
    await inventory.restock('owner-a', 20, 28_000)
    const external = { ...baseInput, shuttleCount: 6, shuttleUnitPrice: 31_000 }
    const created = await repository.create('owner-a', external, calculateSession(external))

    const fromInventory: SessionInput = {
      ...external,
      shuttleSource: 'inventory',
      shuttleUnitPrice: 28_000,
    }
    await repository.update('owner-a', created.id, fromInventory, calculateSession(fromInventory))
    expect(await inventory.getSummary('owner-a')).toMatchObject({ availableCount: 14, usedCount: 6 })

    await inventory.restock('owner-a', 10, 30_000)
    await expect(
      repository.update(
        'owner-a',
        created.id,
        { ...fromInventory, shuttleUnitPrice: 30_000 },
        calculateSession({ ...fromInventory, shuttleUnitPrice: 30_000 }),
      ),
    ).rejects.toBeInstanceOf(ShuttleInventoryPriceError)
    expect((await repository.get('owner-a', created.id)).shuttleUnitPrice).toBe(28_000)

    const backToExternal = { ...fromInventory, shuttleSource: 'external' as const, shuttleUnitPrice: 32_000 }
    await repository.update('owner-a', created.id, backToExternal, calculateSession(backToExternal))
    expect(await inventory.getSummary('owner-a')).toMatchObject({ availableCount: 30, usedCount: 0 })
  })

  it('chặn thiếu tồn kho và rollback toàn bộ lần tạo buổi', async () => {
    const inventory = new ShuttleInventoryRepository(database)
    await inventory.restock('owner-a', 4, 28_000)
    const input: SessionInput = {
      ...baseInput,
      shuttleSource: 'inventory',
      shuttleCount: 5,
      shuttleUnitPrice: 28_000,
    }

    await expect(repository.create('owner-a', input, calculateSession(input))).rejects.toBeInstanceOf(
      ShuttleInventoryStockError,
    )
    expect(await repository.list('owner-a')).toEqual([])
    expect(await inventory.getSummary('owner-a')).toMatchObject({ availableCount: 4, usedCount: 0 })
  })

  it('buổi mới dùng giá nạp gần nhất, còn buổi đang sửa giữ giá cũ', async () => {
    const inventory = new ShuttleInventoryRepository(database)
    await inventory.restock('owner-a', 10, 28_000)
    await inventory.restock('owner-a', 10, 30_000)
    const wrongPrice: SessionInput = {
      ...baseInput,
      shuttleSource: 'inventory',
      shuttleCount: 2,
      shuttleUnitPrice: 28_000,
    }
    await expect(repository.create('owner-a', wrongPrice, calculateSession(wrongPrice))).rejects.toBeInstanceOf(
      ShuttleInventoryPriceError,
    )

    const currentPrice = { ...wrongPrice, shuttleUnitPrice: 30_000 }
    const created = await repository.create('owner-a', currentPrice, calculateSession(currentPrice))
    await inventory.restock('owner-a', 5, 32_000)
    const edited = { ...currentPrice, note: 'Giữ giá snapshot', shuttleCount: 3 }
    const updated = await repository.update('owner-a', created.id, edited, calculateSession(edited))
    expect(updated.shuttleUnitPrice).toBe(30_000)
    expect(await inventory.getSummary('owner-a')).toMatchObject({ availableCount: 22, usedCount: 3, latestUnitPrice: 32_000 })
  })

  it('migrate bản ghi version 1 sang giờ trống mà không mất dữ liệu', async () => {
    const databaseName = `session-migration-${crypto.randomUUID()}`
    const legacyDatabase = new Dexie(databaseName)
    legacyDatabase.version(1).stores({
      accounts: 'id,&emailNormalized,createdAt',
      sessions: 'id,ownerId,[ownerId+playDate],updatedAt',
      settings: 'key',
    })

    const id = crypto.randomUUID()
    const calculation: Partial<SessionCalculation> = { ...calculateSession(baseInput) }
    delete calculation.meal
    await legacyDatabase.table('sessions').add({
      id,
      ownerId: 'owner-a',
      playDate: baseInput.playDate,
      note: baseInput.note,
      courtCost: baseInput.courtCost,
      shuttleCount: baseInput.shuttleCount,
      shuttleUnitPrice: baseInput.shuttleUnitPrice,
      maleCount: baseInput.maleCount,
      femaleCount: baseInput.femaleCount,
      ...calculation,
      ruleVersion: 1,
      maleSurcharge: 20_000,
      roundingUnit: 1_000,
      createdAt: '2026-08-19T12:00:00.000Z',
      updatedAt: '2026-08-19T12:00:00.000Z',
    })
    legacyDatabase.close()

    const migratedDatabase = new AppDatabase(databaseName)
    try {
      await migratedDatabase.open()
      expect(await migratedDatabase.sessions.get(id)).toMatchObject({
        id,
        note: 'Ca tối',
        startTime: '',
        endTime: '',
        meal: null,
        shuttleSource: 'external',
        paymentQrId: null,
      })
      expect(await migratedDatabase.shuttleTransactions.toArray()).toEqual([])
    } finally {
      await migratedDatabase.delete()
    }
  })

  it('migrate database version 3 sang nguồn ngoài và tạo sổ kho trống', async () => {
    const databaseName = `inventory-migration-${crypto.randomUUID()}`
    const legacyDatabase = new Dexie(databaseName)
    legacyDatabase.version(3).stores({
      accounts: 'id,&emailNormalized,createdAt',
      sessions: 'id,ownerId,[ownerId+playDate],updatedAt',
      settings: 'key',
    })

    const id = crypto.randomUUID()
    const legacyRecord = {
      id,
      ownerId: 'owner-a',
      ...baseInput,
      ...calculateSession(baseInput),
      ruleVersion: 3,
      maleSurcharge: 15_000,
      roundingUnit: 1_000,
      createdAt: '2026-08-25T12:00:00.000Z',
      updatedAt: '2026-08-25T12:00:00.000Z',
    }
    delete (legacyRecord as Partial<typeof legacyRecord>).shuttleSource
    await legacyDatabase.table('sessions').add(legacyRecord)
    legacyDatabase.close()

    const migratedDatabase = new AppDatabase(databaseName)
    try {
      await migratedDatabase.open()
      expect(await migratedDatabase.sessions.get(id)).toMatchObject({
        id,
        shuttleSource: 'external',
        shuttleUnitPrice: 30_000,
        paymentQrId: null,
      })
      expect(await migratedDatabase.shuttleTransactions.toArray()).toEqual([])
      expect(await migratedDatabase.paymentQrs.toArray()).toEqual([])
    } finally {
      await migratedDatabase.delete()
    }
  })

  it('migrate database version 4 sang QR mặc định mà không đổi dữ liệu buổi', async () => {
    const databaseName = `payment-qr-migration-${crypto.randomUUID()}`
    const legacyDatabase = new Dexie(databaseName)
    legacyDatabase.version(4).stores({
      accounts: 'id,&emailNormalized,createdAt',
      sessions: 'id,ownerId,[ownerId+playDate],updatedAt',
      shuttleTransactions: 'id,ownerId,[ownerId+createdAt],&sessionId',
      settings: 'key',
    })
    const id = crypto.randomUUID()
    await legacyDatabase.table('sessions').add({
      id,
      ownerId: 'owner-a',
      ...baseInput,
      ...calculateSession(baseInput),
      ruleVersion: 3,
      maleSurcharge: 15_000,
      roundingUnit: 1_000,
      createdAt: '2026-08-26T12:00:00.000Z',
      updatedAt: '2026-08-26T12:00:00.000Z',
    })
    legacyDatabase.close()

    const migratedDatabase = new AppDatabase(databaseName)
    try {
      await migratedDatabase.open()
      expect(await migratedDatabase.sessions.get(id)).toMatchObject({
        id,
        courtCost: baseInput.courtCost,
        shuttleSource: 'external',
        paymentQrId: null,
      })
      expect(await migratedDatabase.paymentQrs.toArray()).toEqual([])
    } finally {
      await migratedDatabase.delete()
    }
  })
})
