import type { AccountRecord, AppDatabase } from '../data/database'
import { hashPassword, verifyPassword } from './passwordCrypto'

export const PASSWORD_ITERATIONS = 600_000
const ACTIVE_ACCOUNT_KEY = 'activeAccountId'

export type Account = Pick<AccountRecord, 'id' | 'email' | 'createdAt'>

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('Email này đã được đăng ký trên thiết bị.')
    this.name = 'EmailAlreadyExistsError'
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Email hoặc mật khẩu không đúng.')
    this.name = 'InvalidCredentialsError'
  }
}

export class AccountNotFoundError extends Error {
  constructor() {
    super('Không tìm thấy tài khoản Gmail này trên thiết bị.')
    this.name = 'AccountNotFoundError'
  }
}

const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase('vi-VN')
const toAccount = ({ id, email, createdAt }: AccountRecord): Account => ({ id, email, createdAt })

export class AuthService {
  private readonly database: AppDatabase
  private readonly passwordIterations: number

  constructor(database: AppDatabase, passwordIterations = PASSWORD_ITERATIONS) {
    this.database = database
    this.passwordIterations = passwordIterations
  }

  async isEmailRegistered(email: string): Promise<boolean> {
    const emailNormalized = normalizeEmail(email)
    return Boolean(await this.database.accounts.where('emailNormalized').equals(emailNormalized).first())
  }

  async register(email: string, password: string): Promise<Account> {
    const emailNormalized = normalizeEmail(email)
    const existing = await this.database.accounts.where('emailNormalized').equals(emailNormalized).first()
    if (existing) throw new EmailAlreadyExistsError()

    const credentials = await hashPassword(password, this.passwordIterations)
    const record: AccountRecord = {
      id: crypto.randomUUID(),
      email: email.trim(),
      emailNormalized,
      passwordHash: credentials.hash,
      passwordSalt: credentials.salt,
      passwordIterations: this.passwordIterations,
      createdAt: new Date().toISOString(),
    }

    await this.database.transaction('rw', this.database.accounts, this.database.settings, async () => {
      await this.database.accounts.add(record)
      await this.database.settings.put({ key: ACTIVE_ACCOUNT_KEY, value: record.id })
    })
    return toAccount(record)
  }

  async login(email: string, password: string): Promise<Account> {
    const record = await this.database.accounts
      .where('emailNormalized')
      .equals(normalizeEmail(email))
      .first()
    if (!record) throw new InvalidCredentialsError()

    const valid = await verifyPassword(
      password,
      record.passwordHash,
      record.passwordSalt,
      record.passwordIterations,
    )
    if (!valid) throw new InvalidCredentialsError()

    await this.database.settings.put({ key: ACTIVE_ACCOUNT_KEY, value: record.id })
    return toAccount(record)
  }

  async resetPassword(email: string, newPassword: string): Promise<Account> {
    const emailNormalized = normalizeEmail(email)
    const record = await this.database.accounts.where('emailNormalized').equals(emailNormalized).first()
    if (!record) throw new AccountNotFoundError()

    const credentials = await hashPassword(newPassword, this.passwordIterations)
    const updated: AccountRecord = {
      ...record,
      passwordHash: credentials.hash,
      passwordSalt: credentials.salt,
      passwordIterations: this.passwordIterations,
    }

    await this.database.transaction('rw', this.database.accounts, this.database.settings, async () => {
      if (!(await this.database.accounts.get(record.id))) throw new AccountNotFoundError()
      await this.database.accounts.put(updated)
      await this.database.settings.put({ key: ACTIVE_ACCOUNT_KEY, value: record.id })
    })
    return toAccount(updated)
  }

  async restoreSession(): Promise<Account | null> {
    const setting = await this.database.settings.get(ACTIVE_ACCOUNT_KEY)
    if (!setting) return null
    const record = await this.database.accounts.get(setting.value)
    if (!record) {
      await this.database.settings.delete(ACTIVE_ACCOUNT_KEY)
      return null
    }
    return toAccount(record)
  }

  async logout(): Promise<void> {
    await this.database.settings.delete(ACTIVE_ACCOUNT_KEY)
  }
}
