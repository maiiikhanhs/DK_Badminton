import type { AppDatabase } from './database'
import {
  ShuttleInventoryAccessError,
  ShuttleInventoryNotFoundError,
  ShuttleInventoryStockError,
  ShuttleInventoryValidationError,
  type ShuttleInventorySummary,
  type ShuttleInventoryTransaction,
} from '../domain/shuttleInventory'

const assertPositiveInteger = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ShuttleInventoryValidationError(`${label} phải là số nguyên lớn hơn 0.`)
  }
}

export const summarizeShuttleTransactions = (
  transactions: ShuttleInventoryTransaction[],
): ShuttleInventorySummary => {
  const availableCount = transactions.reduce((total, item) => total + item.quantityDelta, 0)
  const usedCount = transactions.reduce(
    (total, item) => total + (item.kind === 'session-use' ? Math.abs(item.quantityDelta) : 0),
    0,
  )
  const latestRestock = transactions
    .filter((item) => item.kind === 'restock')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))[0]

  return {
    availableCount,
    usedCount,
    latestUnitPrice: latestRestock?.unitPrice ?? null,
  }
}

export class ShuttleInventoryRepository {
  private readonly database: AppDatabase

  constructor(database: AppDatabase) {
    this.database = database
  }

  async getSummary(ownerId: string): Promise<ShuttleInventorySummary> {
    return summarizeShuttleTransactions(
      await this.database.shuttleTransactions.where('ownerId').equals(ownerId).toArray(),
    )
  }

  async listTransactions(ownerId: string): Promise<ShuttleInventoryTransaction[]> {
    const transactions = await this.database.shuttleTransactions.where('ownerId').equals(ownerId).toArray()
    return transactions.sort(
      (left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
    )
  }

  async restock(ownerId: string, quantity: number, unitPrice: number): Promise<ShuttleInventoryTransaction> {
    assertPositiveInteger(quantity, 'Số cầu nạp')
    assertPositiveInteger(unitPrice, 'Giá một quả cầu')
    const now = new Date().toISOString()
    const transaction: ShuttleInventoryTransaction = {
      id: crypto.randomUUID(),
      ownerId,
      kind: 'restock',
      quantityDelta: quantity,
      unitPrice,
      createdAt: now,
      updatedAt: now,
    }
    await this.database.shuttleTransactions.add(transaction)
    return transaction
  }

  async updateRestock(
    ownerId: string,
    transactionId: string,
    quantity: number,
    unitPrice: number,
  ): Promise<ShuttleInventoryTransaction> {
    assertPositiveInteger(quantity, 'Số cầu nạp')
    assertPositiveInteger(unitPrice, 'Giá một quả cầu')

    return this.database.transaction('rw', this.database.shuttleTransactions, async () => {
      const existing = await this.getOwned(ownerId, transactionId)
      if (existing.kind !== 'restock') throw new ShuttleInventoryValidationError('Chỉ được sửa lần nạp cầu.')
      const summary = await this.getSummary(ownerId)
      const prospectiveStock = summary.availableCount - existing.quantityDelta + quantity
      if (prospectiveStock < 0) {
        throw new ShuttleInventoryStockError(
          `Không thể sửa lần nạp vì kho sẽ thiếu ${Math.abs(prospectiveStock)} quả.`,
          summary.availableCount,
        )
      }

      const updated = {
        ...existing,
        quantityDelta: quantity,
        unitPrice,
        updatedAt: new Date().toISOString(),
      }
      await this.database.shuttleTransactions.put(updated)
      return updated
    })
  }

  async deleteRestock(ownerId: string, transactionId: string): Promise<void> {
    await this.database.transaction('rw', this.database.shuttleTransactions, async () => {
      const existing = await this.getOwned(ownerId, transactionId)
      if (existing.kind !== 'restock') throw new ShuttleInventoryValidationError('Chỉ được xóa lần nạp cầu.')
      const summary = await this.getSummary(ownerId)
      const prospectiveStock = summary.availableCount - existing.quantityDelta
      if (prospectiveStock < 0) {
        throw new ShuttleInventoryStockError(
          `Không thể xóa lần nạp vì kho sẽ thiếu ${Math.abs(prospectiveStock)} quả.`,
          summary.availableCount,
        )
      }
      await this.database.shuttleTransactions.delete(transactionId)
    })
  }

  private async getOwned(ownerId: string, transactionId: string): Promise<ShuttleInventoryTransaction> {
    const transaction = await this.database.shuttleTransactions.get(transactionId)
    if (!transaction) throw new ShuttleInventoryNotFoundError()
    if (transaction.ownerId !== ownerId) throw new ShuttleInventoryAccessError()
    return transaction
  }
}
