const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const MINUTES_PER_DAY = 24 * 60

export const isValidTime = (time: string): boolean => TIME_PATTERN.test(time)

export class SessionTimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionTimeError'
  }
}

const toMinutes = (time: string): number => {
  if (!isValidTime(time)) throw new SessionTimeError('Thời gian không hợp lệ.')

  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const calculateDurationMinutes = (startTime: string, endTime: string): number => {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)

  if (start === end) throw new SessionTimeError('Giờ kết thúc phải khác giờ bắt đầu.')
  return end > start ? end - start : end + MINUTES_PER_DAY - start
}

export const formatDuration = (totalMinutes: number): string => {
  if (!Number.isInteger(totalMinutes) || totalMinutes <= 0) {
    throw new SessionTimeError('Thời lượng không hợp lệ.')
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} phút`
  if (minutes === 0) return `${hours} giờ`
  return `${hours} giờ ${minutes} phút`
}

export const formatTimeRange = (startTime: string, endTime: string): string => `${startTime}–${endTime}`
