// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as paymentQrImage from '../paymentQr/paymentQrImage'
import { PaymentQrCropper } from './PaymentQrCropper'

vi.mock('../paymentQr/paymentQrImage', async (importOriginal) => {
  const original = await importOriginal<typeof paymentQrImage>()
  return {
    ...original,
    loadPaymentQrSource: vi.fn(),
    createPaymentQrPng: vi.fn(),
    hashPaymentQrBlob: vi.fn(),
  }
})

const source = {
  image: document.createElement('img'),
  url: 'blob:payment-qr',
  width: 1200,
  height: 800,
}

describe('PaymentQrCropper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(paymentQrImage.loadPaymentQrSource).mockResolvedValue(source)
    vi.mocked(paymentQrImage.createPaymentQrPng).mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    vi.mocked(paymentQrImage.hashPaymentQrBlob).mockResolvedValue('a'.repeat(64))
  })

  it('mở màn hình căn chỉnh, thay đổi zoom và lưu PNG', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <PaymentQrCropper
        file={new File(['qr'], 'qr.png', { type: 'image/png' })}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Căn chỉnh QR' })).toBeInTheDocument()
    const image = await screen.findByRole('img', { name: 'Ảnh QR đang căn chỉnh' })
    fireEvent.change(screen.getByRole('slider', { name: 'Phóng to ảnh QR' }), { target: { value: '2' } })
    expect(image).toHaveAttribute('style', expect.stringContaining('scale(2)'))

    await user.click(screen.getByRole('button', { name: 'Dùng QR này' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.any(Blob), 'a'.repeat(64)))
    expect(paymentQrImage.createPaymentQrPng).toHaveBeenCalled()
  })

  it('hủy bằng phím Escape mà không lưu ảnh', async () => {
    const onCancel = vi.fn()
    const onSave = vi.fn()
    render(
      <PaymentQrCropper
        file={new File(['qr'], 'qr.webp', { type: 'image/webp' })}
        onCancel={onCancel}
        onSave={onSave}
      />,
    )

    await screen.findByRole('img', { name: 'Ảnh QR đang căn chỉnh' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('hiển thị lỗi khi ảnh không giải mã được', async () => {
    vi.mocked(paymentQrImage.loadPaymentQrSource).mockRejectedValueOnce(new Error('Ảnh QR không hợp lệ.'))
    render(
      <PaymentQrCropper
        file={new File(['broken'], 'broken.jpg', { type: 'image/jpeg' })}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh QR không hợp lệ.')
    expect(screen.getByRole('button', { name: 'Dùng QR này' })).toBeDisabled()
  })
})
