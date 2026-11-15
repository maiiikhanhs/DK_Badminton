import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ArrowLeft, Download, ImageOff, RotateCcw, Share2 } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ResultSharePreviewProps = {
  imageUrl: string
  loading: boolean
  error: string
  message: string
  action: 'share' | 'save' | null
  onClose: () => void
  onRetry: () => void
  onShare: () => void
  onSave: () => void
}

export const ResultSharePreview = ({
  imageUrl,
  loading,
  error,
  message,
  action,
  onClose,
  onRetry,
  onShare,
  onSave,
}: ResultSharePreviewProps) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !action) onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    let removeBackListener: (() => Promise<void>) | undefined
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        if (!action) onClose()
      }).then((handle) => {
        removeBackListener = handle.remove
      })
    }

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
      void removeBackListener?.()
    }
  }, [action, onClose])

  return createPortal(
    <section className="share-preview" role="dialog" aria-modal="true" aria-labelledby="share-preview-title">
      <header className="share-preview__header">
        <button className="icon-button" type="button" onClick={onClose} disabled={Boolean(action)} aria-label="Đóng xem trước ảnh">
          <ArrowLeft />
        </button>
        <div><small>Ảnh kết quả</small><h2 id="share-preview-title">Xem trước</h2></div>
      </header>

      <div className="share-preview__canvas">
        {loading && <div className="share-preview__state"><span className="share-preview__spinner" /><strong>Đang tạo ảnh…</strong><small>Đang chuẩn bị logo, QR và kết quả.</small></div>}
        {!loading && error && (
          <div className="share-preview__state share-preview__state--error">
            <ImageOff />
            <strong>Không thể tạo ảnh</strong>
            <small>{error}</small>
            <button className="button button--secondary" type="button" onClick={onRetry}><RotateCcw /> Thử lại</button>
          </div>
        )}
        {!loading && imageUrl && <img className="share-preview__image" src={imageUrl} alt="Ảnh kết quả buổi chơi DK Badminton" />}
      </div>

      <footer className="share-preview__footer">
        {message && <p className="share-preview__message" role="status">{message}</p>}
        {imageUrl && (
          <div>
            <button className="button button--secondary" type="button" onClick={onSave} disabled={Boolean(action)}>
              <Download /> {action === 'save' ? 'Đang lưu…' : 'Lưu ảnh'}
            </button>
            <button className="button button--primary" type="button" onClick={onShare} disabled={Boolean(action)}>
              <Share2 /> {action === 'share' ? 'Đang mở…' : 'Chia sẻ'}
            </button>
          </div>
        )}
      </footer>
    </section>,
    document.body,
  )
}
