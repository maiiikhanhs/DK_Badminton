import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BadmintonSession } from '../domain/session'
import { ShareResultCard } from './ShareResultCard'

const baseSession: BadmintonSession = {
  id: 'session-1',
  ownerId: 'account-1',
  paymentQrId: null,
  playDate: '2026-08-25',
  startTime: '21:30',
  endTime: '22:30',
  note: 'Sân chiều',
  courtCost: 240_000,
  shuttleCount: 7,
  shuttleUnitPrice: 28_000,
  shuttleSource: 'external',
  maleCount: 2,
  femaleCount: 6,
  shuttleCost: 196_000,
  totalCost: 436_000,
  femaleFee: 51_000,
  maleFee: 66_000,
  totalCollected: 438_000,
  surplus: 2_000,
  meal: null,
  ruleVersion: 3,
  maleSurcharge: 15_000,
  roundingUnit: 1_000,
  createdAt: '2026-08-25T12:00:00.000Z',
  updatedAt: '2026-08-25T12:00:00.000Z',
}

describe('ShareResultCard', () => {
  it('hiển thị đầy đủ thông tin, ghi chú và QR trong ảnh chia sẻ', () => {
    render(<ShareResultCard session={baseSession} />)

    expect(screen.getByText('25/08/2026')).toBeInTheDocument()
    expect(screen.getByText('8 người')).toBeInTheDocument()
    expect(screen.getByText('6 nữ · 2 nam')).toBeInTheDocument()
    expect(screen.getByText('7 × 28.000đ = 196.000đ')).toBeInTheDocument()
    expect(screen.getByText('1 giờ')).toBeInTheDocument()
    expect(screen.getByText('21:30–22:30')).toBeInTheDocument()
    expect(screen.getByText('Sân chiều')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'QR nhận tiền' })).toBeInTheDocument()
    expect(screen.getByText('+15.000đ')).toBeInTheDocument()
    expect(screen.queryByText('Tiền ăn/uống')).not.toBeInTheDocument()
  })

  it('dùng QR tùy chỉnh trong ảnh chia sẻ', () => {
    render(<ShareResultCard session={baseSession} paymentQrSrc="blob:custom-qr" />)
    expect(screen.getByRole('img', { name: 'QR nhận tiền' })).toHaveAttribute('src', 'blob:custom-qr')
  })

  it('hiển thị hai mức đóng và tiền ăn/uống khi buổi chơi có ăn/uống', () => {
    render(
      <ShareResultCard
        session={{
          ...baseSession,
          totalCost: 936_000,
          totalCollected: 942_000,
          surplus: 6_000,
          meal: {
            cost: 500_000,
            femaleCount: 4,
            maleCount: 2,
            peopleCount: 6,
            perPersonFee: 84_000,
            femaleWithMealFee: 135_000,
            maleWithMealFee: 150_000,
            totalCollected: 504_000,
            surplus: 4_000,
          },
        }}
      />,
    )

    expect(screen.getAllByText('Không ăn/uống')).toHaveLength(2)
    expect(screen.getAllByText('Có ăn/uống')).toHaveLength(2)
    expect(screen.getByText('135.000đ')).toBeInTheDocument()
    expect(screen.getByText('150.000đ')).toBeInTheDocument()
    expect(screen.getByText('Tiền ăn/uống')).toBeInTheDocument()
    expect(screen.getByText('936.000đ')).toBeInTheDocument()
    expect(screen.getByText('942.000đ')).toBeInTheDocument()
    expect(screen.getByText('6.000đ')).toBeInTheDocument()
  })

  it('không dành chỗ cho ghi chú khi nội dung trống', () => {
    const { container } = render(<ShareResultCard session={{ ...baseSession, note: '' }} />)
    expect(container.querySelector('.share-card__note')).not.toBeInTheDocument()
  })
})
