import { useEffect, useState } from 'react'
import { defaultPaymentQrImage } from './defaultPaymentQr'
import { paymentQrRepository } from '../services'
import { getErrorMessage } from '../shared/format'

export const usePaymentQrImage = (ownerId: string | undefined, paymentQrId: string | null | undefined) => {
  const requestKey = ownerId && paymentQrId ? `${ownerId}:${paymentQrId}` : ''
  const [result, setResult] = useState({ key: '', src: '', error: '' })

  useEffect(() => {
    if (!requestKey || !ownerId || !paymentQrId) return

    let active = true
    let objectUrl = ''
    paymentQrRepository
      .get(ownerId, paymentQrId)
      .then((record) => {
        if (!active) return
        objectUrl = URL.createObjectURL(record.imageBlob)
        setResult({ key: requestKey, src: objectUrl, error: '' })
      })
      .catch((reason) => {
        if (active) {
          setResult({
            key: requestKey,
            src: '',
            error: getErrorMessage(reason, 'Không thể đọc QR nhận tiền của buổi chơi.'),
          })
        }
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [ownerId, paymentQrId, requestKey])

  if (!paymentQrId) return { src: defaultPaymentQrImage, loading: false, error: '' }
  if (!ownerId || result.key !== requestKey) return { src: '', loading: true, error: '' }
  return { src: result.src, loading: false, error: result.error }
}
