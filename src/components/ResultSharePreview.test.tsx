import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultSharePreview } from './ResultSharePreview'

const defaultProps = {
  imageUrl: 'data:image/png;base64,abc',
  loading: false,
  error: '',
  message: '',
  action: null,
  onClose: vi.fn(),
  onRetry: vi.fn(),
  onShare: vi.fn(),
  onSave: vi.fn(),
} as const

describe('ResultSharePreview', () => {
  it('hiển thị ảnh và gọi đúng hai hành động', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    const onSave = vi.fn()
    render(<ResultSharePreview {...defaultProps} onShare={onShare} onSave={onSave} />)

    expect(screen.getByRole('img', { name: 'Ảnh kết quả buổi chơi DK Badminton' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lưu ảnh' }))
    await user.click(screen.getByRole('button', { name: 'Chia sẻ' }))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onShare).toHaveBeenCalledOnce()
  })

  it('đóng bằng Escape và khôi phục cuộn trang', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ResultSharePreview {...defaultProps} onClose={onClose} />)

    expect(document.body).toHaveStyle({ overflow: 'hidden' })
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('hiển thị trạng thái tạo ảnh và trạng thái thử lại', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ResultSharePreview {...defaultProps} imageUrl="" loading />)
    expect(screen.getByText('Đang tạo ảnh…')).toBeInTheDocument()

    const onRetry = vi.fn()
    rerender(<ResultSharePreview {...defaultProps} imageUrl="" error="QR không tải được." onRetry={onRetry} />)
    expect(screen.getByText('QR không tải được.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Thử lại/ }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
