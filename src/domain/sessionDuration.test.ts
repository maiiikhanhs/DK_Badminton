import { describe, expect, it } from 'vitest'
import {
  calculateDurationMinutes,
  formatDuration,
  formatTimeRange,
  SessionTimeError,
} from './sessionDuration'

describe('sessionDuration', () => {
  it('tính tròn giờ và định dạng gọn', () => {
    const minutes = calculateDurationMinutes('21:30', '22:30')
    expect(minutes).toBe(60)
    expect(formatDuration(minutes)).toBe('1 giờ')
  })

  it('tính giờ có phút lẻ và dưới một giờ', () => {
    expect(formatDuration(calculateDurationMinutes('21:30', '23:00'))).toBe('1 giờ 30 phút')
    expect(formatDuration(calculateDurationMinutes('21:30', '22:15'))).toBe('45 phút')
  })

  it('tính qua nửa đêm khi giờ kết thúc nhỏ hơn giờ bắt đầu', () => {
    expect(calculateDurationMinutes('23:00', '01:00')).toBe(120)
    expect(formatDuration(calculateDurationMinutes('23:00', '01:00'))).toBe('2 giờ')
  })

  it('từ chối hai giờ giống nhau và chuỗi không hợp lệ', () => {
    expect(() => calculateDurationMinutes('21:30', '21:30')).toThrow(SessionTimeError)
    expect(() => calculateDurationMinutes('24:00', '01:00')).toThrow('Thời gian không hợp lệ.')
    expect(() => calculateDurationMinutes('9:00', '10:00')).toThrow('Thời gian không hợp lệ.')
  })

  it('định dạng khoảng giờ bằng dấu gạch nối', () => {
    expect(formatTimeRange('21:30', '22:30')).toBe('21:30–22:30')
  })
})
