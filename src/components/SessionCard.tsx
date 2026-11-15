import { ChevronRight, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BadmintonSession } from '../domain/session'
import { formatDate, formatVnd } from '../shared/format'

export const SessionCard = ({ session }: { session: BadmintonSession }) => (
  <Link className="session-card" to={`/sessions/${session.id}`}>
    <div className="session-card__date">
      <span>{formatDate(session.playDate)}</span>
      <small><UsersRound /> {session.maleCount + session.femaleCount} người</small>
    </div>
    <div className="session-card__money">
      <strong>{formatVnd(session.totalCost)}</strong>
      <small>Dư {formatVnd(session.surplus)}</small>
    </div>
    <ChevronRight className="session-card__arrow" />
  </Link>
)
