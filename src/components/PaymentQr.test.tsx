// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaymentQr } from './PaymentQr'

describe('PaymentQr', () => {
  it('mở ảnh đầy đủ và đóng bằng Escape', async () => {
    const user = userEvent.setup()
    render(<PaymentQr imageSrc="/qr-test.png" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mở QR nhận tiền' }))

    const dialog = screen.getByRole('dialog', { name: 'QR nhận tiền' })
    expect(within(dialog).getByRole('img', { name: 'QR nhận tiền đầy đủ' })).toBeInTheDocument()
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('đóng ảnh đầy đủ bằng nút đóng', async () => {
    const user = userEvent.setup()
    render(<PaymentQr imageSrc="/qr-test.png" />)

    await user.click(screen.getByRole('button', { name: 'Mở QR nhận tiền' }))
    await user.click(screen.getByRole('button', { name: 'Đóng QR nhận tiền' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('đặt nút đổi QR ngay dưới ảnh và trả file đã chọn', async () => {
    const onFileSelected = vi.fn()
    const { container } = render(<PaymentQr imageSrc="/qr-test.png" onFileSelected={onFileSelected} />)
    const changeButton = screen.getByRole('button', { name: 'Đổi QR' })
    expect(changeButton.parentElement).toHaveClass('payment-qr-shell')

    const file = new File(['qr'], 'qr.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)
    expect(onFileSelected).toHaveBeenCalledWith(file)
  })
})
