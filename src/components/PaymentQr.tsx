import { ImagePlus, QrCode, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const PaymentQr = ({
  imageSrc,
  loading = false,
  error = '',
  onFileSelected,
}: {
  imageSrc: string
  loading?: boolean
  error?: string
  onFileSelected?: (file: File) => void
}) => {
  const [open, setOpen] = useState(false)
  const [failedImageSrc, setFailedImageSrc] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const unavailable = failedImageSrc === imageSrc || Boolean(error)

  if (unavailable || loading || !imageSrc) {
    return (
      <div className="payment-qr-shell">
        <div className="payment-qr payment-qr--error" role="status">
          <QrCode />
          <span>{loading ? 'Đang tải QR…' : error || 'Không thể hiển thị QR'}</span>
        </div>
        {onFileSelected && <button className="payment-qr__change" type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus /> Đổi QR</button>}
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFileSelected?.(file)
        }} />
      </div>
    )
  }

  return (
    <div className="payment-qr-shell">
      <button
        className="payment-qr"
        type="button"
        aria-label="Mở QR nhận tiền"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="payment-qr__crop">
          <img src={imageSrc} alt="" onError={() => setFailedImageSrc(imageSrc)} />
        </span>
        <strong>QR nhận tiền</strong>
        <small>Chạm để xem đầy đủ</small>
      </button>

      {onFileSelected && (
        <>
          <button className="payment-qr__change" type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus /> Đổi QR</button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) onFileSelected(file)
          }} />
        </>
      )}

      {open && createPortal(
        <div className="modal-backdrop payment-qr-modal" role="presentation" onClick={() => setOpen(false)}>
          <section
            className="payment-qr-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-qr-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="payment-qr-modal__close" type="button" aria-label="Đóng QR nhận tiền" onClick={() => setOpen(false)}>
              <X />
            </button>
            <div className="payment-qr-modal__heading">
              <QrCode />
              <div>
                <p className="eyebrow">Chuyển khoản</p>
                <h2 id="payment-qr-title">QR nhận tiền</h2>
              </div>
            </div>
            <img className="payment-qr-modal__image" src={imageSrc} alt="QR nhận tiền đầy đủ" />
            <p className="payment-qr-modal__hint">Quét mã bằng ứng dụng ngân hàng để chuyển khoản.</p>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}
