// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaymentQrValidationError } from '../domain/paymentQr'
import {
  clampCropTransform,
  createPaymentQrPng,
  getCoverScale,
  validatePaymentQrFile,
  type PaymentQrSource,
} from './paymentQrImage'

afterEach(() => vi.restoreAllMocks())

describe('phép tính căn chỉnh QR', () => {
  it('phủ kín khung cho ảnh ngang, dọc và vuông', () => {
    expect(getCoverScale(1000, 500, 300)).toBeCloseTo(0.6)
    expect(getCoverScale(500, 1000, 300)).toBeCloseTo(0.6)
    expect(getCoverScale(600, 600, 300)).toBeCloseTo(0.5)
  })

  it('giới hạn zoom và vị trí để không lộ nền', () => {
    expect(clampCropTransform({ offsetX: 999, offsetY: -999, zoom: 0.2 }, 1000, 500, 300)).toEqual({
      zoom: 1,
      offsetX: 150,
      offsetY: 0,
    })
    expect(clampCropTransform({ offsetX: 999, offsetY: -9999, zoom: 9 }, 500, 1000, 300)).toEqual({
      zoom: 5,
      offsetX: 600,
      offsetY: -1350,
    })
  })

  it('chặn loại file sai, file rỗng và file quá 10 MB', () => {
    expect(() => validatePaymentQrFile(new File(['x'], 'qr.gif', { type: 'image/gif' }))).toThrow(
      PaymentQrValidationError,
    )
    expect(() => validatePaymentQrFile(new File([], 'qr.png', { type: 'image/png' }))).toThrow('không có dữ liệu')
    expect(() => validatePaymentQrFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'qr.png', { type: 'image/png' }))).toThrow(
      '10 MB',
    )
  })

  it('xuất canvas PNG vuông 1024 × 1024 theo đúng transform', async () => {
    const setTransform = vi.fn()
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      setTransform,
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['png'], { type: 'image/png' }))
    })
    const source = {
      image: document.createElement('img'),
      url: 'blob:test',
      width: 1000,
      height: 500,
    } satisfies PaymentQrSource

    const blob = await createPaymentQrPng(source, 300, { offsetX: 25, offsetY: 0, zoom: 2 })
    expect(blob.type).toBe('image/png')
    expect(setTransform).toHaveBeenCalledWith(4.096, 0, 0, 4.096, expect.any(Number), 512)
    expect(drawImage).toHaveBeenCalledWith(source.image, -500, -250)
  })
})
