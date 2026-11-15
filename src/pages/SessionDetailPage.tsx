import { Clock3, Edit3, Share2, Trash2, UsersRound } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { PaymentQr } from '../components/PaymentQr'
import { PaymentQrCropper } from '../components/PaymentQrCropper'
import { ResultSharePreview } from '../components/ResultSharePreview'
import { ResultPanel } from '../components/ResultPanel'
import { ShareResultCard } from '../components/ShareResultCard'
import type { BadmintonSession } from '../domain/session'
import { paymentQrRepository, sessionRepository } from '../services'
import { usePaymentQrImage } from '../paymentQr/usePaymentQrImage'
import { calculateDurationMinutes, formatDuration, formatTimeRange } from '../domain/sessionDuration'
import {
  buildShareFileName,
  generateSessionResultImage,
  saveSessionResultImage,
  shareSessionResultImage,
} from '../sharing/sessionResultShare'
import { formatDate, formatVnd, getErrorMessage } from '../shared/format'

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

export const SessionDetailPage = () => {
  const { id } = useParams()
  const { account } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<BadmintonSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false)
  const [shareCaptureMounted, setShareCaptureMounted] = useState(false)
  const [shareGenerating, setShareGenerating] = useState(false)
  const [shareImageUrl, setShareImageUrl] = useState('')
  const [shareFileName, setShareFileName] = useState('')
  const [shareError, setShareError] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareAction, setShareAction] = useState<'share' | 'save' | null>(null)
  const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null)
  const [qrMessage, setQrMessage] = useState('')
  const shareCardRef = useRef<HTMLDivElement>(null)
  const shareGenerationId = useRef(0)
  const paymentQr = usePaymentQrImage(account?.id, session?.paymentQrId)

  useEffect(() => {
    if (!id || !account) return
    sessionRepository
      .get(account.id, id)
      .then(setSession)
      .catch((reason) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false))
  }, [account, id])

  const openSharePreview = useCallback(() => {
    if (!session || shareGenerating) return
    if (paymentQr.loading) {
      setError('QR nhận tiền vẫn đang được tải. Vui lòng thử lại sau một chút.')
      return
    }
    if (paymentQr.error || !paymentQr.src) {
      setError(paymentQr.error || 'Không thể tải QR nhận tiền để tạo ảnh chia sẻ.')
      return
    }

    shareGenerationId.current += 1
    setSharePreviewOpen(true)
    setShareCaptureMounted(true)
    setShareGenerating(true)
    setShareImageUrl('')
    setShareFileName(buildShareFileName(session.playDate))
    setShareError('')
    setShareMessage('')
  }, [paymentQr.error, paymentQr.loading, paymentQr.src, session, shareGenerating])

  const closeSharePreview = useCallback(() => {
    shareGenerationId.current += 1
    setSharePreviewOpen(false)
    setShareCaptureMounted(false)
    setShareGenerating(false)
    setShareAction(null)
    setShareMessage('')
  }, [])

  useEffect(() => {
    if (!shareCaptureMounted || !session || !shareCardRef.current) return

    const generationId = shareGenerationId.current
    generateSessionResultImage(shareCardRef.current)
      .then((imageUrl) => {
        if (shareGenerationId.current !== generationId) return
        setShareImageUrl(imageUrl)
      })
      .catch((reason) => {
        if (shareGenerationId.current !== generationId) return
        setShareError(getErrorMessage(reason, 'Không thể tạo ảnh kết quả.'))
      })
      .finally(() => {
        if (shareGenerationId.current !== generationId) return
        setShareGenerating(false)
        setShareCaptureMounted(false)
      })
  }, [session, shareCaptureMounted])

  const shareImage = async () => {
    if (!session || !shareImageUrl || !shareFileName || shareAction) return
    setShareAction('share')
    setShareMessage('')
    try {
      setShareMessage(await shareSessionResultImage(shareImageUrl, shareFileName, formatDate(session.playDate)))
    } catch (reason) {
      setShareMessage(getErrorMessage(reason, 'Không thể chia sẻ ảnh. Vui lòng thử lại.'))
    } finally {
      setShareAction(null)
    }
  }

  const saveImage = async () => {
    if (!shareImageUrl || !shareFileName || shareAction) return
    setShareAction('save')
    setShareMessage('')
    try {
      setShareMessage(await saveSessionResultImage(shareImageUrl, shareFileName))
    } catch (reason) {
      setShareMessage(getErrorMessage(reason, 'Không thể lưu ảnh. Vui lòng thử lại.'))
    } finally {
      setShareAction(null)
    }
  }

  const remove = async () => {
    if (!id || !account) return
    setDeleting(true)
    try {
      await sessionRepository.delete(account.id, id)
      navigate('/history', { replace: true })
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể xóa buổi chơi.'))
      setConfirming(false)
      setDeleting(false)
    }
  }

  const savePaymentQr = async (blob: Blob, contentHash: string) => {
    if (!account || !session) return
    const record = await paymentQrRepository.saveForSession(account.id, session.id, blob, contentHash)
    setSession((current) => current ? { ...current, paymentQrId: record.id, updatedAt: new Date().toISOString() } : current)
    setQrMessage('Đã cập nhật QR nhận tiền cho buổi chơi.')
    setError('')
    setSelectedQrFile(null)
  }

  if (loading) return <div className="page"><div className="skeleton-form"><i /><i /><i /></div></div>
  if (!session) return <div className="page"><PageHeader title="Không tìm thấy" back /><div className="form-alert">{error || 'Buổi chơi không tồn tại.'}</div></div>

  const timeSummary = getTimeSummary(session)

  return (
    <div className="page page--detail">
      <PageHeader
        eyebrow="Chi tiết buổi chơi"
        title={formatDate(session.playDate)}
        back
        action={<button className="icon-button" type="button" onClick={openSharePreview} disabled={shareGenerating} aria-label="Chia sẻ kết quả"><Share2 /></button>}
      />
      {Boolean((location.state as { saved?: boolean } | null)?.saved) && <div className="success-banner">Đã lưu buổi chơi trên thiết bị.</div>}
      <section className="detail-card detail-card--meta">
        <div><small>Người chơi</small><strong><UsersRound /> {session.maleCount + session.femaleCount} người</strong><span>{session.femaleCount} nữ · {session.maleCount} nam</span></div>
        <div><small>Tiền sân</small><strong>{formatVnd(session.courtCost)}</strong></div>
        <div><small>Tiền cầu</small><strong className="detail-card__shuttle-cost">{session.shuttleCount} × {formatVnd(session.shuttleUnitPrice)} = {formatVnd(session.shuttleCost)}</strong><span>{session.shuttleSource === 'inventory' ? 'Kho của tôi' : 'Người khác mang'}</span></div>
        <div>
          <small>Số giờ chơi</small>
          <strong className={timeSummary ? undefined : 'detail-card__empty'}><Clock3 /> {timeSummary?.duration || 'Chưa có thời gian'}</strong>
          {timeSummary && <span>{timeSummary.range}</span>}
        </div>
      </section>
      {session.note && <section className="note-card"><small>Ghi chú:</small><p>{session.note}</p></section>}
      <ResultPanel
        result={session}
        maleCount={session.maleCount}
        femaleCount={session.femaleCount}
        maleSurcharge={session.maleSurcharge}
        paymentQr={
          <PaymentQr
            imageSrc={paymentQr.src}
            loading={paymentQr.loading}
            error={paymentQr.error}
            onFileSelected={(file) => {
              setQrMessage('')
              setSelectedQrFile(file)
            }}
          />
        }
      />
      {qrMessage && <div className="success-banner" role="status">{qrMessage}</div>}
      {error && <div className="form-alert">{error}</div>}
      <div className="detail-actions">
        <Link className="button button--secondary" to={`/sessions/${session.id}/edit`}><Edit3 /> Sửa & tính lại</Link>
        <button className="button button--danger-ghost" type="button" onClick={() => setConfirming(true)}><Trash2 /> Xóa</button>
      </div>

      {confirming && createPortal(
        <div className="modal-backdrop" role="presentation" onClick={() => !deleting && setConfirming(false)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(event) => event.stopPropagation()}>
            <span className="confirm-modal__icon"><Trash2 /></span>
            <h2 id="delete-title">Xóa buổi chơi?</h2>
            <p>Dữ liệu đã xóa không thể khôi phục trên thiết bị này.</p>
            <div><button className="button button--secondary" type="button" onClick={() => setConfirming(false)} disabled={deleting}>Giữ lại</button><button className="button button--danger" type="button" onClick={remove} disabled={deleting}>{deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</button></div>
          </section>
        </div>,
        document.body,
      )}

      {shareCaptureMounted && createPortal(
        <div className="share-card-capture" aria-hidden="true">
          <ShareResultCard ref={shareCardRef} session={session} paymentQrSrc={paymentQr.src} />
        </div>,
        document.body,
      )}

      {sharePreviewOpen && (
        <ResultSharePreview
          imageUrl={shareImageUrl}
          loading={shareGenerating}
          error={shareError}
          message={shareMessage}
          action={shareAction}
          onClose={closeSharePreview}
          onRetry={openSharePreview}
          onShare={shareImage}
          onSave={saveImage}
        />
      )}

      {selectedQrFile && (
        <PaymentQrCropper
          file={selectedQrFile}
          onCancel={() => setSelectedQrFile(null)}
          onSave={savePaymentQr}
        />
      )}
    </div>
  )
}
