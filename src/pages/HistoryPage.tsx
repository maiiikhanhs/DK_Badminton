import { CirclePlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SessionCard } from '../components/SessionCard'
import type { BadmintonSession } from '../domain/session'
import { sessionRepository } from '../services'
import { getErrorMessage } from '../shared/format'

export const HistoryPage = () => {
  const { account } = useAuth()
  const [sessions, setSessions] = useState<BadmintonSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!account) return
    sessionRepository
      .list(account.id)
      .then(setSessions)
      .catch((reason) => setError(getErrorMessage(reason, 'Không thể tải lịch sử.')))
      .finally(() => setLoading(false))
  }, [account])

  return (
    <div className="page">
      <PageHeader eyebrow="Sổ thu chi" title="Lịch sử" />
      {loading && <div className="skeleton-list"><i /><i /><i /></div>}
      {error && <div className="form-alert" role="alert">{error}</div>}
      {!loading && !error && sessions.length === 0 ? (
        <EmptyState
          title="Chưa có buổi chơi"
          description="Mỗi buổi đã lưu sẽ xuất hiện tại đây."
          action={<Link className="button button--primary" to="/sessions/new"><CirclePlus /> Tạo buổi chơi</Link>}
        />
      ) : (
        <div className="session-list session-list--history">
          {sessions.map((session) => <SessionCard key={session.id} session={session} />)}
        </div>
      )}
    </div>
  )
}
