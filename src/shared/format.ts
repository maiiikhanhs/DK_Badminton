export const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))

export const todayLocal = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export const getErrorMessage = (error: unknown, fallback = 'Đã có lỗi xảy ra.') =>
  error instanceof Error ? error.message : fallback
