import { ArrowRight, CalendarPlus, Clock3, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { SessionCard } from '../components/SessionCard'
import type { BadmintonSession } from '../domain/session'
import { sessionRepository } from '../services'
import { formatVnd, getErrorMessage } from '../shared/format'

export const HomePage = () => {
  const { account } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [passwordReset] = useState(() => {
    const resetFromNavigation = Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset)
    const resetFromSession = window.sessionStorage.getItem('dk-password-reset-success') === '1'
    window.sessionStorage.removeItem('dk-password-reset-success')
    return resetFromNavigation || resetFromSession
  })
  const [sessions, setSessions] = useState<BadmintonSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!account) return
    sessionRepository
      .list(account.id)
      .then(setSessions)
      .catch((reason) => setError(getErrorMessage(reason, 'Không thể đọc lịch sử.')))
      .finally(() => setLoading(false))
  }, [account])

  useEffect(() => {
    if (!passwordReset) return
    const timer = window.setTimeout(() => navigate(location.pathname, { replace: true, state: null }), 3500)
    return () => window.clearTimeout(timer)
  }, [location.pathname, navigate, passwordReset])

  const totalSpent = useMemo(() => sessions.reduce((sum, item) => sum + item.totalCost, 0), [sessions])

  return (
    <div className="page page--home">
      {passwordReset && <div className="success-banner" role="status">Đã đặt mật khẩu mới và đăng nhập thành công.</div>}
      <section className="hero-card">
        <div>
          <p className="eyebrow">Sẵn sàng lên sân?</p>
          <h1>Chia tiền<br /><em>Không chia vui.</em></h1>
          <p>Nhập vài con số, DK Badminton lo phần còn lại.</p>
        </div>
        <Link className="hero-card__action" to="/sessions/new"><CalendarPlus /> Tạo buổi chơi <ArrowRight /></Link>
        <div className="hero-card__shuttle" aria-hidden="true">◒</div>
      </section>

      <section className="summary-grid" aria-label="Tổng quan">
        <article><Clock3 /><span><strong>{sessions.length}</strong><small>Buổi đã lưu</small></span></article>
        <article><WalletCards /><span><strong>{formatVnd(totalSpent)}</strong><small>Tổng chi phí</small></span></article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Gần đây</p><h2>Lịch sử buổi chơi</h2></div>
          {sessions.length > 0 && <Link to="/history">Xem tất cả</Link>}
        </div>
        {loading && <div className="skeleton-list"><i /><i /></div>}
        {error && <div className="form-alert" role="alert">{error}</div>}
        {!loading && !error && sessions.length === 0 && (
          <EmptyState
            title="Sổ đang trống"
            description="Tạo buổi chơi đầu tiên để bắt đầu theo dõi chi phí."
            action={<Link className="button button--secondary" to="/sessions/new">Tạo ngay</Link>}
          />
        )}
        <div className="session-list">{sessions.slice(0, 3).map((session) => <SessionCard key={session.id} session={session} />)}</div>
      </section>

    </div>
  )
}
