import Dexie, { type EntityTable } from 'dexie'
import type { BadmintonSession } from '../domain/session'
import type { ShuttleInventoryTransaction } from '../domain/shuttleInventory'
import type { PaymentQrRecord } from '../domain/paymentQr'

export type AccountRecord = {
  id: string
  email: string
  emailNormalized: string
  passwordHash: string
  passwordSalt: string
  passwordIterations: number
  createdAt: string
}

export type SettingRecord = {
  key: string
  value: string
}

export class AppDatabase extends Dexie {
  accounts!: EntityTable<AccountRecord, 'id'>
  sessions!: EntityTable<BadmintonSession, 'id'>
  shuttleTransactions!: EntityTable<ShuttleInventoryTransaction, 'id'>
  paymentQrs!: EntityTable<PaymentQrRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>

  constructor(name = 'dk-badminton') {
    super(name)
    const stores = {
      accounts: 'id,&emailNormalized,createdAt',
      sessions: 'id,ownerId,[ownerId+playDate],updatedAt',
      settings: 'key',
    }
    const inventoryStores = {
      ...stores,
      shuttleTransactions: 'id,ownerId,[ownerId+createdAt],&sessionId',
    }
    const paymentQrStores = {
      ...inventoryStores,
      paymentQrs: 'id,ownerId,[ownerId+createdAt],&[ownerId+contentHash]',
    }

    this.version(1).stores(stores)
    this.version(2)
      .stores(stores)
      .upgrade((transaction) =>
        transaction
          .table('sessions')
          .toCollection()
          .modify((session: Partial<BadmintonSession>) => {
            if (typeof session.startTime !== 'string') session.startTime = ''
            if (typeof session.endTime !== 'string') session.endTime = ''
          }),
      )
    this.version(3)
      .stores(stores)
      .upgrade((transaction) =>
        transaction
          .table('sessions')
          .toCollection()
          .modify((session: Partial<BadmintonSession>) => {
            if (session.meal === undefined) session.meal = null
          }),
      )
    this.version(4)
      .stores(inventoryStores)
      .upgrade((transaction) =>
        transaction
          .table('sessions')
          .toCollection()
          .modify((session: Partial<BadmintonSession>) => {
            if (session.shuttleSource !== 'inventory' && session.shuttleSource !== 'external') {
              session.shuttleSource = 'external'
            }
          }),
      )
    this.version(5)
      .stores(paymentQrStores)
      .upgrade((transaction) =>
        transaction
          .table('sessions')
          .toCollection()
          .modify((session: Partial<BadmintonSession>) => {
            if (typeof session.paymentQrId !== 'string') session.paymentQrId = null
          }),
      )
  }
}

export const db = new AppDatabase()
