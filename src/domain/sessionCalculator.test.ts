import { describe, expect, it } from 'vitest'
import { SessionValidationError, type SessionInput } from './session'
import { calculateSession } from './sessionCalculator'

const input = (changes: Partial<SessionInput> = {}): SessionInput => ({
  playDate: '2026-08-19',
  startTime: '21:30',
  endTime: '22:30',
  note: '',
  courtCost: 240_000,
  shuttleCount: 6,
  shuttleUnitPrice: 30_000,
  shuttleSource: 'external',
  maleCount: 4,
  femaleCount: 3,
  meal: null,
  ...changes,
})

describe('calculateSession', () => {
  it('phụ thu nam 15.000đ khi có cả nam và nữ', () => {
    expect(calculateSession(input())).toEqual({
      shuttleCost: 180_000,
      totalCost: 420_000,
      femaleFee: 52_000,
      maleFee: 67_000,
      totalCollected: 424_000,
      surplus: 4_000,
      meal: null,
    })
  })

  it('làm tròn đúng khi có cả nam và nữ', () => {
    expect(calculateSession(input({ courtCost: 120_000, shuttleCount: 0, maleCount: 2, femaleCount: 2 }))).toMatchObject({
      femaleFee: 23_000,
      maleFee: 38_000,
      totalCollected: 122_000,
      surplus: 2_000,
    })
  })

  it('chia đều 240.000đ cho 8 nữ và không phụ thu', () => {
    expect(calculateSession(input({ courtCost: 240_000, shuttleCount: 0, maleCount: 0, femaleCount: 8 }))).toMatchObject({
      femaleFee: 30_000,
      maleFee: 30_000,
      totalCollected: 240_000,
      surplus: 0,
    })
  })

  it('chia đều 240.000đ cho 8 nam và không phụ thu', () => {
    expect(calculateSession(input({ courtCost: 240_000, shuttleCount: 0, maleCount: 8, femaleCount: 0 }))).toMatchObject({
      femaleFee: 30_000,
      maleFee: 30_000,
      totalCollected: 240_000,
      surplus: 0,
    })
  })

  it('làm tròn lên nghìn khi chỉ có một giới tính', () => {
    expect(calculateSession(input({ courtCost: 100_000, shuttleCount: 0, maleCount: 3, femaleCount: 0 }))).toMatchObject({
      femaleFee: 34_000,
      maleFee: 34_000,
      totalCollected: 102_000,
      surplus: 2_000,
    })
  })

  it('chặn buổi không có người', () => {
    expect(() => calculateSession(input({ maleCount: 0, femaleCount: 0 }))).toThrowError(SessionValidationError)
  })

  it('chặn chi phí cơ sở âm khi có cả nam và nữ', () => {
    expect(() => calculateSession(input({ courtCost: 10_000, shuttleCount: 0, maleCount: 2, femaleCount: 1 }))).toThrow(
      'Tổng chi phí phải lớn hơn hoặc bằng tổng phụ thu của nam.',
    )
  })

  it('không áp dụng lỗi chi phí cơ sở khi chỉ có nam', () => {
    expect(calculateSession(input({ courtCost: 10_000, shuttleCount: 0, maleCount: 2, femaleCount: 0 }))).toMatchObject({
      maleFee: 5_000,
      totalCollected: 10_000,
      surplus: 0,
    })
  })

  it('chặn số thập phân và số âm', () => {
    expect(() => calculateSession(input({ shuttleCount: 1.5 }))).toThrow('Số cầu phải là số nguyên không âm.')
    expect(() => calculateSession(input({ courtCost: -1 }))).toThrow('Tiền sân phải là số nguyên không âm.')
  })

  it('chia đều tiền ăn, làm tròn nghìn và cộng vào tổng buổi', () => {
    expect(calculateSession(input({
      courtCost: 240_000,
      shuttleCount: 7,
      shuttleUnitPrice: 28_000,
      maleCount: 2,
      femaleCount: 6,
      meal: { cost: 500_000, maleCount: 2, femaleCount: 4 },
    }))).toEqual({
      shuttleCost: 196_000,
      totalCost: 936_000,
      femaleFee: 51_000,
      maleFee: 66_000,
      totalCollected: 942_000,
      surplus: 6_000,
      meal: {
        cost: 500_000,
        maleCount: 2,
        femaleCount: 4,
        peopleCount: 6,
        perPersonFee: 84_000,
        femaleWithMealFee: 135_000,
        maleWithMealFee: 150_000,
        totalCollected: 504_000,
        surplus: 4_000,
      },
    })
  })

  it('chia tiền ăn chính xác không dư cho một giới tính', () => {
    expect(calculateSession(input({
      courtCost: 240_000,
      shuttleCount: 0,
      maleCount: 8,
      femaleCount: 0,
      meal: { cost: 240_000, maleCount: 8, femaleCount: 0 },
    }))).toMatchObject({
      maleFee: 30_000,
      totalCost: 480_000,
      totalCollected: 480_000,
      surplus: 0,
      meal: { perPersonFee: 30_000, maleWithMealFee: 60_000, surplus: 0 },
    })
  })

  it('chặn dữ liệu buổi ăn không hợp lệ', () => {
    expect(() => calculateSession(input({ meal: { cost: 0, maleCount: 1, femaleCount: 0 } }))).toThrow(
      'Tổng hóa đơn ăn/uống phải lớn hơn 0đ.',
    )
    expect(() => calculateSession(input({ meal: { cost: 100_000, maleCount: 0, femaleCount: 0 } }))).toThrow(
      'Cần có ít nhất một người đi ăn/uống.',
    )
    expect(() => calculateSession(input({ meal: { cost: 100_000, maleCount: 5, femaleCount: 0 } }))).toThrow(
      'Số nam đi ăn/uống không được vượt số nam chơi.',
    )
    expect(() => calculateSession(input({ meal: { cost: 100_000, maleCount: 0, femaleCount: 4 } }))).toThrow(
      'Số nữ đi ăn/uống không được vượt số nữ chơi.',
    )
    expect(() => calculateSession(input({ meal: { cost: 100_000.5, maleCount: 1, femaleCount: 0 } }))).toThrow(
      'Tổng hóa đơn ăn/uống phải là số nguyên không âm.',
    )
  })
})
