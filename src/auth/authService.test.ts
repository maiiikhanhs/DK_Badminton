import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../data/database'
import { AccountNotFoundError, AuthService, EmailAlreadyExistsError, InvalidCredentialsError } from './authService'

describe('AuthService', () => {
  let database: AppDatabase
  let service: AuthService

  beforeEach(() => {
    database = new AppDatabase(`auth-service-${crypto.randomUUID()}`)
    service = new AuthService(database, 10)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('đăng ký, băm mật khẩu và khôi phục phiên', async () => {
    const account = await service.register('  BAN@ViDu.vn ', 'mat-khau-an-toan')
    expect(account.email).toBe('BAN@ViDu.vn')
    const stored = await database.accounts.get(account.id)
    expect(stored?.passwordHash).not.toContain('mat-khau-an-toan')
    expect(stored?.emailNormalized).toBe('ban@vidu.vn')
    await expect(service.restoreSession()).resolves.toEqual(account)
  })

  it('không cho đăng ký email trùng không phân biệt hoa thường', async () => {
    await service.register('ban@vidu.vn', 'mat-khau-an-toan')
    await expect(service.isEmailRegistered('  BAN@VIDU.VN ')).resolves.toBe(true)
    await expect(service.isEmailRegistered('moi@gmail.com')).resolves.toBe(false)
    await expect(service.register('BAN@VIDU.VN', 'mat-khau-khac')).rejects.toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('đăng nhập đúng, từ chối mật khẩu sai và đăng xuất', async () => {
    const account = await service.register('ban@vidu.vn', 'mat-khau-an-toan')
    await service.logout()
    await expect(service.login('ban@vidu.vn', 'sai-mat-khau')).rejects.toBeInstanceOf(InvalidCredentialsError)
    await expect(service.login('ban@vidu.vn', 'mat-khau-an-toan')).resolves.toEqual(account)
    await service.logout()
    await expect(service.restoreSession()).resolves.toBeNull()
  })

  it('đặt mật khẩu mới, giữ nguyên tài khoản và tự khôi phục phiên', async () => {
    const account = await service.register('ban@gmail.com', 'mat-khau-cu')
    const before = await database.accounts.get(account.id)
    await service.logout()

    const resetAccount = await service.resetPassword('  BAN@GMAIL.COM ', 'mat-khau-moi')
    const after = await database.accounts.get(account.id)

    expect(resetAccount).toEqual(account)
    expect(after?.id).toBe(before?.id)
    expect(after?.email).toBe(before?.email)
    expect(after?.createdAt).toBe(before?.createdAt)
    expect(after?.passwordHash).not.toBe(before?.passwordHash)
    expect(after?.passwordSalt).not.toBe(before?.passwordSalt)
    await expect(service.login('ban@gmail.com', 'mat-khau-cu')).rejects.toBeInstanceOf(InvalidCredentialsError)
    await expect(service.login('ban@gmail.com', 'mat-khau-moi')).resolves.toEqual(account)
    await expect(service.restoreSession()).resolves.toEqual(account)
  })

  it('không đặt lại mật khẩu cho tài khoản không tồn tại', async () => {
    await expect(service.resetPassword('khongco@gmail.com', 'mat-khau-moi')).rejects.toBeInstanceOf(AccountNotFoundError)
  })
})
