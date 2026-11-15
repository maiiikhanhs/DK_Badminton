export type ShuttleTransactionKind = 'restock' | 'session-use'

export type ShuttleInventoryTransaction = {
  id: string
  ownerId: string
  kind: ShuttleTransactionKind
  quantityDelta: number
  unitPrice: number
  sessionId?: string
  createdAt: string
  updatedAt: string
}

export type ShuttleInventorySummary = {
  availableCount: number
  usedCount: number
  latestUnitPrice: number | null
}

export class ShuttleInventoryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShuttleInventoryValidationError'
  }
}

export class ShuttleInventoryNotFoundError extends Error {
  constructor() {
    super('Không tìm thấy giao dịch kho cầu.')
    this.name = 'ShuttleInventoryNotFoundError'
  }
}

export class ShuttleInventoryAccessError extends Error {
  constructor() {
    super('Bạn không có quyền truy cập giao dịch kho cầu này.')
    this.name = 'ShuttleInventoryAccessError'
  }
}

export class ShuttleInventoryStockError extends Error {
  readonly availableCount: number

  constructor(message: string, availableCount: number) {
    super(message)
    this.name = 'ShuttleInventoryStockError'
    this.availableCount = availableCount
  }
}

export class ShuttleInventoryPriceError extends Error {
  constructor() {
    super('Giá cầu trong kho đã thay đổi. Hãy mở lại form và tính tiền lại.')
    this.name = 'ShuttleInventoryPriceError'
  }
}
