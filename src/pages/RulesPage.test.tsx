import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RulesPage } from './RulesPage'

describe('RulesPage', () => {
  it('mở mặc định luật đơn và hiển thị luật tính điểm BWF', () => {
    render(<MemoryRouter><RulesPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Luật chơi' })).toBeInTheDocument()
    expect(screen.queryByText('Theo luật BWF')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Đánh đơn' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('img', { name: /Sơ đồ sân đánh đơn/ })).toBeInTheDocument()
    expect(screen.getByText('Sân hẹp, phát dài')).toBeInTheDocument()
    expect(screen.getByText('20–20: phải dẫn trước 2 điểm để thắng game.')).toBeInTheDocument()
    expect(screen.queryByText('Luân chuyển quyền phát')).not.toBeInTheDocument()
  })

  it('chuyển sang luật đôi và hiển thị phạm vi phát cùng luân chuyển quyền phát', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RulesPage /></MemoryRouter>)

    await user.click(screen.getByRole('tab', { name: 'Đánh đôi' }))

    expect(screen.getByRole('tab', { name: 'Đánh đôi' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('img', { name: /Sơ đồ sân đánh đôi/ })).toBeInTheDocument()
    expect(screen.getByText('Sân rộng, phát ngắn hơn')).toBeInTheDocument()
    expect(screen.getByText('Luân chuyển quyền phát')).toBeInTheDocument()
  })
})
