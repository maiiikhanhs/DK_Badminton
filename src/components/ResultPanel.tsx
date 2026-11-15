import { CircleCheckBig } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SessionCalculation } from '../domain/session'
import { formatVnd } from '../shared/format'

type ResultPanelProps = {
  result: SessionCalculation
  maleCount: number
  femaleCount: number
  maleSurcharge: number
  paymentQr?: ReactNode
}

const FeeOptions = ({ baseFee, mealFee }: { baseFee: number; mealFee: number }) => (
  <div className="fee-options">
    <span><em>Không ăn/uống</em><strong>{formatVnd(baseFee)}</strong></span>
    <span><em>Có ăn/uống</em><strong>{formatVnd(mealFee)}</strong></span>
  </div>
)

export const ResultPanel = ({
  result,
  maleCount,
  femaleCount,
  maleSurcharge,
  paymentQr,
}: ResultPanelProps) => {
  const hasMixedGenders = maleCount > 0 && femaleCount > 0
  const sharedFee = maleCount > 0 ? result.maleFee : result.femaleFee
  const meal = result.meal

  return (
    <section className={`result-panel${paymentQr ? ' result-panel--with-qr' : ''}`} aria-live="polite">
      <div className="result-panel__heading">
        <CircleCheckBig />
        <div>
          <p className="eyebrow">Đã tính xong</p>
          <h2>Mỗi người cần đóng</h2>
        </div>
      </div>
      <div className={paymentQr ? 'result-panel__payment' : undefined}>
        {hasMixedGenders ? (
          <div className={`fee-pair${meal ? ' fee-pair--meal' : ''}`}>
            <div>
              <small>Nữ</small>
              {meal
                ? <FeeOptions baseFee={result.femaleFee} mealFee={meal.femaleWithMealFee} />
                : <strong>{formatVnd(result.femaleFee)}</strong>}
            </div>
            <div className="fee-pair__male">
              <small>Nam</small>
              {meal
                ? <FeeOptions baseFee={result.maleFee} mealFee={meal.maleWithMealFee} />
                : <strong>{formatVnd(result.maleFee)}</strong>}
              <span className="fee-pair__surcharge">+{formatVnd(maleSurcharge)}</span>
            </div>
          </div>
        ) : (
          <div className={`fee-pair fee-pair--single${meal ? ' fee-pair--meal' : ''}`}>
            <div>
              <small>Mỗi người</small>
              {meal
                ? <FeeOptions baseFee={sharedFee} mealFee={sharedFee + meal.perPersonFee} />
                : <strong>{formatVnd(sharedFee)}</strong>}
            </div>
          </div>
        )}
        {paymentQr}
      </div>
      <dl className={`result-breakdown result-breakdown--${meal ? 'four' : 'three'}`}>
        {meal && <div><dt>TIỀN ĂN/UỐNG</dt><dd>{formatVnd(meal.cost)}</dd></div>}
        <div><dt>TỔNG CHI PHÍ</dt><dd>{formatVnd(result.totalCost)}</dd></div>
        <div><dt>TỔNG THU</dt><dd>{formatVnd(result.totalCollected)}</dd></div>
        <div className="result-breakdown__surplus"><dt>TIỀN ĐỚP</dt><dd>{formatVnd(result.surplus)}</dd></div>
      </dl>
    </section>
  )
}
