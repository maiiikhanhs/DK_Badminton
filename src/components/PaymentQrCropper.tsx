import { ImageIcon, Minus, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CropTransform, PaymentQrSource } from '../paymentQr/paymentQrImage'
import {
  clampCropTransform,
  createPaymentQrPng,
  getCoverScale,
  hashPaymentQrBlob,
  loadPaymentQrSource,
} from '../paymentQr/paymentQrImage'
import { getErrorMessage } from '../shared/format'

type Point = { x: number; y: number }

const midpoint = (left: Point, right: Point) => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 })
const distance = (left: Point, right: Point) => Math.hypot(right.x - left.x, right.y - left.y)

export const PaymentQrCropper = ({
  file,
  onCancel,
  onSave,
}: {
  file: File
  onCancel: () => void
  onSave: (blob: Blob, contentHash: string) => Promise<void>
}) => {
  const frameRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const transformRef = useRef<CropTransform>({ offsetX: 0, offsetY: 0, zoom: 1 })
  const [source, setSource] = useState<PaymentQrSource | null>(null)
  const [frameSize, setFrameSize] = useState(320)
  const [transform, setTransform] = useState<CropTransform>({ offsetX: 0, offsetY: 0, zoom: 1 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const commitTransform = useCallback((next: CropTransform) => {
    if (!source) return
    const clamped = clampCropTransform(next, source.width, source.height, frameSize)
    transformRef.current = clamped
    setTransform(clamped)
  }, [frameSize, source])

  useEffect(() => {
    let active = true
    let loadedSource: PaymentQrSource | null = null
    loadPaymentQrSource(file)
      .then((nextSource) => {
        loadedSource = nextSource
        if (!active) {
          URL.revokeObjectURL(nextSource.url)
          return
        }
        setSource(nextSource)
        transformRef.current = { offsetX: 0, offsetY: 0, zoom: 1 }
        setTransform(transformRef.current)
      })
      .catch((reason) => {
        if (active) setError(getErrorMessage(reason, 'Không thể mở ảnh QR.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      if (loadedSource) URL.revokeObjectURL(loadedSource.url)
    }
  }, [file])

  useEffect(() => {
    const updateFrameSize = () => {
      const nextSize = frameRef.current?.clientWidth
      if (nextSize && nextSize !== frameSize) setFrameSize(nextSize)
    }
    updateFrameSize()
    window.addEventListener('resize', updateFrameSize)
    return () => window.removeEventListener('resize', updateFrameSize)
  }, [frameSize])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onCancel, saving])

  useEffect(() => {
    if (source) commitTransform(transformRef.current)
  }, [commitTransform, source])

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!source || saving) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const previousPoint = pointersRef.current.get(event.pointerId)
    if (!source || !previousPoint || saving) return
    const previousPointers = Array.from(pointersRef.current.values())
    const nextPoint = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, nextPoint)
    const nextPointers = Array.from(pointersRef.current.values())

    if (nextPointers.length === 1) {
      commitTransform({
        ...transformRef.current,
        offsetX: transformRef.current.offsetX + nextPoint.x - previousPoint.x,
        offsetY: transformRef.current.offsetY + nextPoint.y - previousPoint.y,
      })
      return
    }
    if (nextPointers.length >= 2) {
      const oldMiddle = midpoint(previousPointers[0], previousPointers[1])
      const newMiddle = midpoint(nextPointers[0], nextPointers[1])
      const oldDistance = Math.max(1, distance(previousPointers[0], previousPointers[1]))
      const nextZoom = Math.min(5, Math.max(1, transformRef.current.zoom * distance(nextPointers[0], nextPointers[1]) / oldDistance))
      const ratio = nextZoom / transformRef.current.zoom
      const frameCenter = frameSize / 2
      commitTransform({
        zoom: nextZoom,
        offsetX: newMiddle.x - frameRef.current!.getBoundingClientRect().left - frameCenter -
          (oldMiddle.x - frameRef.current!.getBoundingClientRect().left - frameCenter - transformRef.current.offsetX) * ratio,
        offsetY: newMiddle.y - frameRef.current!.getBoundingClientRect().top - frameCenter -
          (oldMiddle.y - frameRef.current!.getBoundingClientRect().top - frameCenter - transformRef.current.offsetY) * ratio,
      })
    }
  }

  const pointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
  }

  const changeZoom = (nextZoom: number) => commitTransform({ ...transformRef.current, zoom: nextZoom })

  const save = async () => {
    if (!source || saving) return
    setSaving(true)
    setError('')
    try {
      const blob = await createPaymentQrPng(source, frameSize, transformRef.current)
      await onSave(blob, await hashPaymentQrBlob(blob))
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể lưu QR. Vui lòng thử lại.'))
      setSaving(false)
    }
  }

  const coverScale = source ? getCoverScale(source.width, source.height, frameSize) : 1

  return createPortal(
    <section className="qr-cropper" role="dialog" aria-modal="true" aria-labelledby="qr-cropper-title">
      <header className="qr-cropper__header">
        <button type="button" aria-label="Hủy thay đổi QR" onClick={onCancel} disabled={saving}><X /></button>
        <div><small>QR nhận tiền</small><h2 id="qr-cropper-title">Căn chỉnh QR</h2></div>
      </header>

      <div className="qr-cropper__body">
        <div
          className="qr-cropper__frame"
          ref={frameRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
        >
          {loading && <div className="qr-cropper__state"><span className="share-preview__spinner" /><strong>Đang mở ảnh…</strong></div>}
          {!loading && !source && <div className="qr-cropper__state"><ImageIcon /><strong>Không thể mở ảnh</strong></div>}
          {source && (
            <img
              src={source.url}
              alt="Ảnh QR đang căn chỉnh"
              draggable={false}
              style={{
                width: source.width * coverScale,
                height: source.height * coverScale,
                transform: `translate(-50%, -50%) translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.zoom})`,
              }}
            />
          )}
          {source && <span className="qr-cropper__guide">Kéo ảnh để căn giữa mã QR</span>}
        </div>

        <div className="qr-cropper__zoom">
          <Minus />
          <input
            type="range"
            min="1"
            max="5"
            step="0.01"
            value={transform.zoom}
            aria-label="Phóng to ảnh QR"
            onChange={(event) => changeZoom(Number(event.target.value))}
            disabled={!source || saving}
          />
          <Plus />
        </div>
        <p>Phóng to hoặc thu nhỏ để QR nằm vừa khung vuông.</p>
        {error && <div className="form-alert" role="alert">{error}</div>}
      </div>

      <footer className="qr-cropper__footer">
        <button className="button button--secondary" type="button" onClick={onCancel} disabled={saving}>Hủy</button>
        <button className="button button--primary" type="button" onClick={() => void save()} disabled={!source || saving}>
          {saving ? 'Đang lưu QR…' : 'Dùng QR này'}
        </button>
      </footer>
    </section>,
    document.body,
  )
}
