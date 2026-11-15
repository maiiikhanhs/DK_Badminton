// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { db } from './data/database'
import type { BadmintonSession } from './domain/session'
import { calculateSession } from './domain/sessionCalculator'
import { authService, otpService } from './services'

const renderApp = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )

const replaceNumber = async (label: string, value: string) => {
  const user = userEvent.setup()
  const field = screen.getByLabelText(new RegExp(label, 'i'))
  await user.clear(field)
  await user.type(field, value)
}

describe('luồng MVP', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.spyOn(otpService, 'sendOtp').mockResolvedValue({
      expiresIn: 300,
      resendAfter: 60,
      message: 'Đã gửi mã.',
    })
    vi.spyOn(otpService, 'verifyOtp').mockResolvedValue({
      verified: true,
      message: 'Xác minh thành công.',
    })
    await db.open()
    await db.transaction('rw', db.accounts, db.sessions, db.shuttleTransactions, db.paymentQrs, db.settings, async () => {
      await Promise.all([
        db.accounts.clear(),
        db.sessions.clear(),
        db.shuttleTransactions.clear(),
        db.paymentQrs.clear(),
        db.settings.clear(),
      ])
    })
  })

  it('đăng ký, tạo, sửa, xóa buổi chơi và đăng xuất', async () => {
    const user = userEvent.setup()
    renderApp('/register')

    expect(await screen.findByLabelText('Gmail')).toBeInTheDocument()
    expect(screen.queryByText('Tài khoản và dữ liệu chỉ được lưu cục bộ, không gửi lên mạng.')).not.toBeInTheDocument()
    expect(screen.queryByText('Hoạt động offline trên thiết bị')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Gmail'), 'ban@gmail.com')
    await user.type(screen.getByLabelText(/^Mật khẩu$/), 'mat-khau-an-toan')
    await user.type(screen.getByLabelText('Nhập lại mật khẩu'), 'mat-khau-an-toan')
    await user.click(screen.getByRole('button', { name: /Gửi mã xác minh/ }))

    expect(await screen.findByRole('heading', { name: 'Xác minh Gmail' })).toBeInTheDocument()
    expect(await db.accounts.count()).toBe(0)
    await user.type(screen.getByLabelText('Mã xác minh'), '123456')
    await user.click(screen.getByRole('button', { name: /Xác minh và tạo tài khoản/ }))

    expect(await screen.findByRole('link', { name: /Tạo buổi chơi/ }, { timeout: 10_000 })).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mở menu' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Kho cầu'),
      expect.stringContaining('Luật chơi'),
      expect.stringContaining('Đăng xuất'),
    ])
    expect(screen.getByText('Thông tin tài khoản')).toBeInTheDocument()
    expect(screen.getByText('ban@gmail.com')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Thông tin tài khoản/ })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mở menu' }))
    await user.click(screen.getByRole('main'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mở menu' }))
    await user.click(screen.getByRole('menuitem', { name: /Luật chơi/ }))
    expect(await screen.findByRole('heading', { name: 'Luật chơi' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(await screen.findByRole('link', { name: /Tạo buổi chơi/ })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Tạo buổi chơi/ }))

    expect(await screen.findByRole('heading', { name: 'Thông tin buổi chơi' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chi phí' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Người chơi' })).toBeInTheDocument()
    expect(screen.queryByText(/Bước 0[123]/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Ghi chú/)).toHaveAttribute('rows', '1')

    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))
    expect(await screen.findByText('Chọn giờ bắt đầu.')).toBeInTheDocument()
    expect(screen.getByText('Chọn giờ kết thúc.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Từ/), { target: { value: '21:30' } })
    fireEvent.change(screen.getByLabelText(/^Đến/), { target: { value: '22:30' } })

    await replaceNumber('Tiền sân', '240000')
    await replaceNumber('Số cầu', '6')
    await replaceNumber('Giá một quả', '30000')
    await user.click(screen.getByLabelText(/Người khác mang/))
    await replaceNumber('Số nữ', '3')
    await replaceNumber('Số nam', '4')
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))

    expect(await screen.findByText('52.000đ')).toBeInTheDocument()
    expect(screen.getByText('67.000đ')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mở QR nhận tiền' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Lưu buổi chơi/ }))
    expect(await screen.findByText('Đã lưu buổi chơi trên thiết bị.')).toBeInTheDocument()
    expect(screen.getByText('1 giờ')).toBeInTheDocument()
    expect(screen.getByText('21:30–22:30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chia sẻ kết quả' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sửa & tính lại/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sửa buổi chơi' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mở QR nhận tiền' }))
    const qrDialog = screen.getByRole('dialog', { name: 'QR nhận tiền' })
    expect(within(qrDialog).getByRole('img', { name: 'QR nhận tiền đầy đủ' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'QR nhận tiền' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Sửa & tính lại/ }))
    await replaceNumber('Tiền sân', '260000')
    fireEvent.change(screen.getByLabelText(/^Đến/), { target: { value: '23:00' } })
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))
    expect(await screen.findByText('55.000đ')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Lưu thay đổi/ }))
    expect(await screen.findByText('Đã lưu buổi chơi trên thiết bị.')).toBeInTheDocument()
    expect(screen.getByText('1 giờ 30 phút')).toBeInTheDocument()
    expect(screen.getByText('21:30–23:00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xóa' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Xóa vĩnh viễn' }))
    expect(await screen.findByText('Chưa có buổi chơi')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Trang chủ/ }))
    await user.click(screen.getByRole('button', { name: 'Mở menu' }))
    await user.click(screen.getByRole('menuitem', { name: /Đăng xuất/ }))
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
    expect(screen.queryByText('Hoạt động offline trên thiết bị')).not.toBeInTheDocument()
    expect(screen.queryByText('Mở sổ buổi chơi đã lưu trên điện thoại này.')).not.toBeInTheDocument()
  }, 30_000)

  it('khôi phục mật khẩu bằng OTP, giữ nguyên tài khoản và tự đăng nhập', async () => {
    const user = userEvent.setup()
    const account = await authService.register('quen@gmail.com', 'mat-khau-cu')
    await authService.logout()
    renderApp('/login')

    expect(await screen.findByRole('link', { name: 'Quên mật khẩu?' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Quên mật khẩu?' }))
    expect(await screen.findByRole('heading', { name: 'Quên mật khẩu' })).toBeInTheDocument()

    const recoveryEmail = screen.getByPlaceholderText('ban@gmail.com')
    await user.type(recoveryEmail, 'sai@vidu.vn')
    await user.click(screen.getByRole('button', { name: /Gửi mã xác minh/ }))
    expect(await screen.findByText('Chỉ hỗ trợ địa chỉ @gmail.com.')).toBeInTheDocument()

    await user.clear(recoveryEmail)
    await user.type(recoveryEmail, 'khongco@gmail.com')
    await user.click(screen.getByRole('button', { name: /Gửi mã xác minh/ }))
    expect(await screen.findByText('Không tìm thấy tài khoản Gmail này trên thiết bị.')).toBeInTheDocument()

    await user.clear(recoveryEmail)
    await user.type(recoveryEmail, 'QUEN@GMAIL.COM')
    await user.click(screen.getByRole('button', { name: /Gửi mã xác minh/ }))
    expect(await screen.findByRole('heading', { name: 'Nhập mã OTP' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Mật khẩu mới')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Mã xác minh'), '123456')
    await user.click(screen.getByRole('button', { name: /Xác minh mã OTP/ }))
    expect(await screen.findByRole('heading', { name: 'Mật khẩu mới' })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Mật khẩu mới$/), 'mat-khau-moi')
    const confirmNewPassword = screen.getByPlaceholderText('Nhập lại mật khẩu')
    await user.type(confirmNewPassword, 'khong-khop')
    await user.click(screen.getByRole('button', { name: /Đặt mật khẩu mới/ }))
    expect(await screen.findByText('Mật khẩu nhập lại chưa khớp.')).toBeInTheDocument()

    await user.clear(confirmNewPassword)
    await user.type(confirmNewPassword, 'mat-khau-moi')
    await user.click(screen.getByRole('button', { name: /Đặt mật khẩu mới/ }))

    expect(await screen.findByText('Đã đặt mật khẩu mới và đăng nhập thành công.', {}, { timeout: 10_000 })).toBeInTheDocument()
    expect((await db.accounts.where('emailNormalized').equals('quen@gmail.com').first())?.id).toBe(account.id)
    await expect(authService.login('quen@gmail.com', 'mat-khau-cu')).rejects.toThrow('Email hoặc mật khẩu không đúng.')
    await expect(authService.login('quen@gmail.com', 'mat-khau-moi')).resolves.toMatchObject({ id: account.id })
  }, 30_000)

  it('hiển thị trạng thái thời gian cho bản ghi cũ và bắt buộc nhập khi sửa', async () => {
    const user = userEvent.setup()
    const account = await authService.register('cu@vidu.vn', 'mat-khau-an-toan')
    const input = {
      playDate: '2026-08-18',
      startTime: '20:00',
      endTime: '21:00',
      note: 'Bản ghi cũ',
      courtCost: 240_000,
      shuttleCount: 6,
      shuttleUnitPrice: 30_000,
      shuttleSource: 'external' as const,
      maleCount: 4,
      femaleCount: 3,
      meal: null,
    }
    const id = crypto.randomUUID()
    const legacySession = {
      id,
      ownerId: account.id,
      playDate: input.playDate,
      note: input.note,
      courtCost: input.courtCost,
      shuttleCount: input.shuttleCount,
      shuttleUnitPrice: input.shuttleUnitPrice,
      maleCount: input.maleCount,
      femaleCount: input.femaleCount,
      ...calculateSession(input),
      ruleVersion: 1,
      maleSurcharge: 20_000,
      roundingUnit: 1_000,
      createdAt: '2026-08-18T12:00:00.000Z',
      updatedAt: '2026-08-18T12:00:00.000Z',
    } as BadmintonSession
    delete (legacySession as Partial<BadmintonSession>).startTime
    delete (legacySession as Partial<BadmintonSession>).endTime
    await db.sessions.add(legacySession)

    renderApp(`/sessions/${id}`)
    expect(await screen.findByText('Chưa có thời gian')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Sửa & tính lại/ }))
    expect(await screen.findByLabelText(/^Từ/)).toHaveValue('')
    expect(screen.getByLabelText(/^Đến/)).toHaveValue('')
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))
    expect(await screen.findByText('Chọn giờ bắt đầu.')).toBeInTheDocument()
    expect(screen.getByText('Chọn giờ kết thúc.')).toBeInTheDocument()
  }, 30_000)

  it('bật tiền ăn, tính gộp, lưu và tắt lại khi sửa buổi chơi', async () => {
    const user = userEvent.setup()
    await authService.register('an@vidu.vn', 'mat-khau-an-toan')
    renderApp('/sessions/new')

    expect(await screen.findByRole('heading', { name: 'Ăn/uống sau buổi chơi' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Tổng hóa đơn ăn/uống')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Từ/), { target: { value: '21:30' } })
    fireEvent.change(screen.getByLabelText(/^Đến/), { target: { value: '22:30' } })
    await replaceNumber('Tiền sân', '240000')
    await replaceNumber('Số cầu', '7')
    await replaceNumber('Giá một quả', '28000')
    await user.click(screen.getByLabelText(/Người khác mang/))
    await replaceNumber('Số nữ', '6')
    await replaceNumber('Số nam', '2')

    await user.click(screen.getByRole('checkbox', { name: /Có ăn\/uống sau buổi chơi/ }))
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))
    expect(await screen.findByText('Tổng hóa đơn ăn/uống phải lớn hơn 0đ.')).toBeInTheDocument()
    expect(screen.getByText('Cần có ít nhất một người đi ăn/uống.')).toBeInTheDocument()
    await replaceNumber('Tổng hóa đơn ăn/uống', '500000')
    await replaceNumber('Số nữ đi ăn/uống', '4')
    await replaceNumber('Số nam đi ăn/uống', '2')
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))

    expect(await screen.findByText('135.000đ')).toBeInTheDocument()
    expect(screen.getByText('150.000đ')).toBeInTheDocument()
    expect(screen.getByText('TIỀN ĂN/UỐNG')).toBeInTheDocument()
    expect(screen.getByText('936.000đ')).toBeInTheDocument()
    expect(screen.getByText('942.000đ')).toBeInTheDocument()
    expect(screen.getByText('6.000đ')).toBeInTheDocument()

    await replaceNumber('Tổng hóa đơn ăn/uống', '510000')
    expect(screen.queryByRole('button', { name: /Lưu buổi chơi/ })).not.toBeInTheDocument()
    await replaceNumber('Tổng hóa đơn ăn/uống', '500000')
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))
    await user.click(await screen.findByRole('button', { name: /Lưu buổi chơi/ }))

    expect(await screen.findByText('7 × 28.000đ = 196.000đ')).toBeInTheDocument()
    expect(screen.getByText('TIỀN ĂN/UỐNG')).toBeInTheDocument()
    expect(screen.getByText('936.000đ')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Sửa & tính lại/ }))
    const mealToggle = await screen.findByRole('checkbox', { name: /Có ăn\/uống sau buổi chơi/ })
    expect(mealToggle).toBeChecked()
    await user.click(mealToggle)
    expect(screen.queryByLabelText('Tổng hóa đơn ăn/uống')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))
    await user.click(await screen.findByRole('button', { name: /Lưu thay đổi/ }))

    expect(await screen.findByText('Đã lưu buổi chơi trên thiết bị.')).toBeInTheDocument()
    expect(await screen.findByText('436.000đ')).toBeInTheDocument()
    expect(screen.queryByText('TIỀN ĂN/UỐNG')).not.toBeInTheDocument()
    expect(screen.getAllByRole('term')).toHaveLength(3)
  }, 30_000)

  it('nạp kho, dùng giá tự điền và trừ cầu khi lưu buổi chơi', async () => {
    const user = userEvent.setup()
    await authService.register('kho@vidu.vn', 'mat-khau-an-toan')
    renderApp('/home')

    await screen.findByRole('link', { name: /Tạo buổi chơi/ })
    await user.click(screen.getByRole('button', { name: 'Mở menu' }))
    await user.click(screen.getByRole('menuitem', { name: /Kho cầu/ }))
    expect(await screen.findByRole('heading', { name: 'Kho cầu' })).toBeInTheDocument()
    const emptySummary = screen.getByLabelText('Tổng quan kho cầu')
    expect(within(emptySummary).getAllByText('0')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /Nạp thêm cầu/ }))
    await replaceNumber('Số cầu nạp', '12')
    await replaceNumber('Giá một quả', '28000')
    await user.click(screen.getByRole('button', { name: /Nạp vào kho/ }))
    expect(await screen.findByText('Đã nạp thêm 12 quả cầu.')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Tổng quan kho cầu')).getByText('12')).toBeInTheDocument()
    expect(screen.getByText('28.000đ / quả')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    await user.click(await screen.findByRole('link', { name: /Tạo buổi chơi/ }))
    fireEvent.change(await screen.findByLabelText(/^Từ/), { target: { value: '20:00' } })
    fireEvent.change(screen.getByLabelText(/^Đến/), { target: { value: '22:00' } })
    await replaceNumber('Tiền sân', '240000')
    await replaceNumber('Số cầu', '7')
    await user.click(screen.getByLabelText(/Kho của tôi/))
    expect(screen.getByLabelText(/Giá một quả/i)).toHaveValue(28_000)
    expect(screen.getByLabelText(/Giá một quả/i)).toHaveAttribute('readonly')
    await replaceNumber('Số nữ', '4')
    await replaceNumber('Số nam', '4')
    await user.click(screen.getByRole('button', { name: /Tính tiền/ }))
    await user.click(await screen.findByRole('button', { name: /Lưu buổi chơi/ }))

    expect(await screen.findByRole('button', { name: 'Chia sẻ kết quả' })).toBeInTheDocument()
    expect(screen.getByText('Kho của tôi')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mở menu' }))
    await user.click(screen.getByRole('menuitem', { name: /Kho cầu/ }))
    const updatedSummary = await screen.findByLabelText('Tổng quan kho cầu')
    expect(within(updatedSummary).getByText('5')).toBeInTheDocument()
    expect(within(updatedSummary).getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Dùng cho buổi chơi')).toBeInTheDocument()
  }, 30_000)
})
