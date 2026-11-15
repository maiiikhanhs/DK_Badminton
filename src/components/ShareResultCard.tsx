import { Clock3, UsersRound } from 'lucide-react'
import { forwardRef } from 'react'
import { defaultPaymentQrImage } from '../paymentQr/defaultPaymentQr'
import type { BadmintonSession } from '../domain/session'
import { calculateDurationMinutes, formatDuration, formatTimeRange } from '../domain/sessionDuration'
import { formatDate, formatVnd } from '../shared/format'

const getTimeSummary = (session: BadmintonSession) => {
  if (!session.startTime || !session.endTime) return null

  try {
    return {
      duration: formatDuration(calculateDurationMinutes(session.startTime, session.endTime)),
      range: formatTimeRange(session.startTime, session.endTime),
    }
  } catch {
    return null
  }
}

const ShareFeeOptions = ({ baseFee, mealFee }: { baseFee: number; mealFee: number }) => (
  <div className="share-card__fee-options">
    <span><em>Không ăn/uống</em><strong>{formatVnd(baseFee)}</strong></span>
    <span><em>Có ăn/uống</em><strong>{formatVnd(mealFee)}</strong></span>
  </div>
)

export const ShareResultCard = forwardRef<HTMLDivElement, { session: BadmintonSession; paymentQrSrc?: string }>(
  ({ session, paymentQrSrc = defaultPaymentQrImage }, ref) => {
    const timeSummary = getTimeSummary(session)
    const hasMixedGenders = session.maleCount > 0 && session.femaleCount > 0
    const sharedFee = session.maleCount > 0 ? session.maleFee : session.femaleFee
    const meal = session.meal

    return (
      <article className="share-card" ref={ref} aria-label="Ảnh kết quả buổi chơi">
        <header className="share-card__header">
          <div className="share-card__brand">
            <img src="/logo.jpg" alt="Logo DK Badminton" />
            <div><strong>DK</strong><span>Badminton</span></div>
          </div>
          <div className="share-card__date">
            <small>Chi tiết buổi chơi</small>
            <strong>{formatDate(session.playDate)}</strong>
          </div>
        </header>

        <section className="share-card__meta">
          <div>
            <small>Người chơi</small>
            <strong><UsersRound /> {session.maleCount + session.femaleCount} người</strong>
            <span>{session.femaleCount} nữ · {session.maleCount} nam</span>
          </div>
          <div>
            <small>Tiền sân</small>
            <strong>{formatVnd(session.courtCost)}</strong>
          </div>
          <div>
            <small>Tiền cầu</small>
            <strong className="share-card__shuttle-cost">{session.shuttleCount} × {formatVnd(session.shuttleUnitPrice)} = {formatVnd(session.shuttleCost)}</strong>
          </div>
          <div>
            <small>Số giờ chơi</small>
            <strong><Clock3 /> {timeSummary?.duration || 'Chưa có thời gian'}</strong>
            {timeSummary && <span>{timeSummary.range}</span>}
          </div>
        </section>

        {session.note && <p className="share-card__note"><strong>Ghi chú:</strong> {session.note}</p>}

        <section className="share-card__result">
          <div className="share-card__result-heading">
            <span aria-hidden="true">✓</span>
            <div><small>Đã tính xong</small><h2>Mỗi người cần đóng</h2></div>
          </div>

          <div className="share-card__payment">
            <div className={`share-card__fees${meal ? ' share-card__fees--meal' : ''}`}>
              {hasMixedGenders ? (
                <>
                  <div>
                    <small>Nữ</small>
                    {meal
                      ? <ShareFeeOptions baseFee={session.femaleFee} mealFee={meal.femaleWithMealFee} />
                      : <strong>{formatVnd(session.femaleFee)}</strong>}
                  </div>
                  <div className="share-card__male-fee">
                    <small>Nam</small>
                    {meal
                      ? <ShareFeeOptions baseFee={session.maleFee} mealFee={meal.maleWithMealFee} />
                      : <strong>{formatVnd(session.maleFee)}</strong>}
                    <span>+{formatVnd(session.maleSurcharge)}</span>
                  </div>
                </>
              ) : (
                <div className="share-card__shared-fee">
                  <small>Mỗi người</small>
                  {meal
                    ? <ShareFeeOptions baseFee={sharedFee} mealFee={sharedFee + meal.perPersonFee} />
                    : <strong>{formatVnd(sharedFee)}</strong>}
                </div>
              )}
            </div>

            <div className="share-card__qr">
              <img src={paymentQrSrc} alt="QR nhận tiền" />
              <strong>QR nhận tiền</strong>
              <small>Quét mã để chuyển khoản</small>
            </div>
          </div>

          <dl className={`share-card__totals share-card__totals--${meal ? 'four' : 'three'}`}>
            {meal && <div><dt>Tiền ăn/uống</dt><dd>{formatVnd(meal.cost)}</dd></div>}
            <div><dt>Tổng chi phí</dt><dd>{formatVnd(session.totalCost)}</dd></div>
            <div><dt>Tổng thu</dt><dd>{formatVnd(session.totalCollected)}</dd></div>
            <div className="share-card__surplus"><dt>Tiền đớp</dt><dd>{formatVnd(session.surplus)}</dd></div>
          </dl>
        </section>
      </article>
    )
  },
)

ShareResultCard.displayName = 'ShareResultCard'
