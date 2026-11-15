import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SessionCalculation } from '../domain/session'
import { ResultPanel } from './ResultPanel'

const result: SessionCalculation = {
  shuttleCost: 0,
  totalCost: 240_000,
  femaleFee: 30_000,
  maleFee: 30_000,
  totalCollected: 240_000,
  surplus: 0,
  meal: null,
}

describe('ResultPanel', () => {
  it.each([
    { maleCount: 8, femaleCount: 0 },
    { maleCount: 0, femaleCount: 8 },
  ])('chỉ hiển thị một mức chung khi chỉ có một giới tính', ({ maleCount, femaleCount }) => {
    render(
      <ResultPanel
        result={result}
        maleCount={maleCount}
        femaleCount={femaleCount}
        maleSurcharge={15_000}
      />,
    )

    expect(screen.getAllByText('Mỗi người')).toHaveLength(1)
    expect(screen.getByText('30.000đ')).toBeInTheDocument()
    expect(screen.queryByText('Nam')).not.toBeInTheDocument()
    expect(screen.queryByText('Nữ')).not.toBeInTheDocument()
    expect(screen.queryByText('+15.000đ')).not.toBeInTheDocument()
  })

  it('hiển thị phụ thu 15.000đ cho buổi hỗn hợp mới', () => {
    render(
      <ResultPanel
        result={{ ...result, femaleFee: 52_000, maleFee: 67_000, totalCollected: 424_000, surplus: 4_000 }}
        maleCount={4}
        femaleCount={3}
        maleSurcharge={15_000}
      />,
    )

    expect(screen.getByText('Nữ')).toBeInTheDocument()
    expect(screen.getByText('Nam')).toBeInTheDocument()
    expect(screen.getByText('+15.000đ')).toBeInTheDocument()
  })

  it('dùng snapshot phụ thu 20.000đ cho lịch sử version 1', () => {
    render(
      <ResultPanel
        result={{ ...result, femaleFee: 49_000, maleFee: 69_000, totalCollected: 423_000, surplus: 3_000 }}
        maleCount={4}
        femaleCount={3}
        maleSurcharge={20_000}
      />,
    )

    expect(screen.getByText('+20.000đ')).toBeInTheDocument()
  })

  it('hiển thị mức có ăn và bốn ô tổng kết khi có buổi ăn', () => {
    render(
      <ResultPanel
        result={{
          shuttleCost: 196_000,
          totalCost: 936_000,
          femaleFee: 51_000,
          maleFee: 66_000,
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
        maleCount={2}
        femaleCount={6}
        maleSurcharge={15_000}
      />,
    )

    expect(screen.getAllByText('Không ăn/uống')).toHaveLength(2)
    expect(screen.getAllByText('Có ăn/uống')).toHaveLength(2)
    expect(screen.getByText('135.000đ')).toBeInTheDocument()
    expect(screen.getByText('150.000đ')).toBeInTheDocument()
    expect(screen.getByText('TIỀN ĂN/UỐNG')).toBeInTheDocument()
    expect(screen.queryByText('TIỀN CẦU')).not.toBeInTheDocument()
  })
})
