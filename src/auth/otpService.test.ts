import { describe, expect, it, vi } from 'vitest'
import { OtpService, OtpServiceError } from './otpService'

describe('OtpService', () => {
  it('gửi OTP với Gmail đã chuẩn hóa', async () => {
    const transport = vi.fn().mockResolvedValue({
      ok: true,
      expiresIn: 300,
      resendAfter: 60,
      message: 'Đã gửi mã.',
    })
    const service = new OtpService('', transport)

    await expect(service.sendOtp('  BAN@GMAIL.COM ')).resolves.toEqual({
      expiresIn: 300,
      resendAfter: 60,
      message: 'Đã gửi mã.',
    })
    expect(transport).toHaveBeenCalledWith({ action: 'sendOtp', email: 'ban@gmail.com' })
  })

  it('xác minh OTP thành công', async () => {
    const transport = vi.fn().mockResolvedValue({ ok: true, verified: true, message: 'Thành công.' })
    const service = new OtpService('', transport)

    await expect(service.verifyOtp('ban@gmail.com', ' 123456 ')).resolves.toEqual({
      verified: true,
      message: 'Thành công.',
    })
    expect(transport).toHaveBeenCalledWith({ action: 'verifyOtp', email: 'ban@gmail.com', otp: '123456' })
  })

  it('chuẩn hóa lỗi mã sai và số lần còn lại', async () => {
    const service = new OtpService('', async () => ({
      ok: false,
      code: 'OTP_INCORRECT',
      message: 'Mã xác minh chưa đúng.',
      remainingAttempts: 3,
    }))

    const request = service.verifyOtp('ban@gmail.com', '000000')
    await expect(request).rejects.toMatchObject({
      name: 'OtpServiceError',
      code: 'OTP_INCORRECT',
      remainingAttempts: 3,
    })
  })

  it('báo lỗi khi phản hồi không hợp lệ', async () => {
    const service = new OtpService('', async () => '<html>error</html>')
    await expect(service.sendOtp('ban@gmail.com')).rejects.toBeInstanceOf(OtpServiceError)
  })
})
