import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
  savePng: vi.fn(),
  deleteFile: vi.fn(),
  writeFile: vi.fn(),
  getUri: vi.fn(),
  share: vi.fn(),
  toPng: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
  registerPlugin: () => ({ savePng: mocks.savePng }),
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    deleteFile: mocks.deleteFile,
    writeFile: mocks.writeFile,
    getUri: mocks.getUri,
  },
}))

vi.mock('@capacitor/share', () => ({ Share: { share: mocks.share } }))
vi.mock('html-to-image', () => ({ toPng: mocks.toPng }))

import {
  buildShareFileName,
  generateSessionResultImage,
  saveSessionResultImage,
  shareSessionResultImage,
} from './sessionResultShare'

describe('sessionResultShare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isNativePlatform.mockReturnValue(true)
    mocks.getUri.mockResolvedValue({ uri: 'file:///cache/result.png' })
    mocks.savePng.mockResolvedValue({ uri: 'content://gallery/result.png' })
    mocks.toPng.mockResolvedValue('data:image/png;base64,result')
  })

  it('tạo tên file có ngày chơi và thời điểm hiện tại', () => {
    const now = new Date(2026, 7, 26, 9, 5, 7)
    expect(buildShareFileName('2026-08-25', now)).toBe('DK-Badminton-2026-08-25-090507.png')
  })

  it('chờ ảnh rồi xuất thẻ ở chiều rộng 1080px', async () => {
    const node = document.createElement('div')
    Object.defineProperty(node, 'scrollHeight', { value: 1440 })
    const image = document.createElement('img')
    Object.defineProperties(image, {
      complete: { value: true },
      naturalWidth: { value: 300 },
    })
    node.append(image)

    await generateSessionResultImage(node)
    expect(mocks.toPng).toHaveBeenCalledWith(node, expect.objectContaining({
      width: 1080,
      height: 1440,
      canvasWidth: 1080,
      canvasHeight: 1440,
    }))
  })

  it('ghi file cache và mở bảng chia sẻ Android', async () => {
    await shareSessionResultImage(
      'data:image/png;base64,YWJj',
      'DK-Badminton-2026-08-25-090507.png',
      '25/08/2026',
    )

    expect(mocks.writeFile).toHaveBeenCalledWith({
      path: 'DK-Badminton-2026-08-25-090507.png',
      directory: 'CACHE',
      data: 'YWJj',
    })
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({
      files: ['file:///cache/result.png'],
      dialogTitle: 'Chia sẻ kết quả',
    }))
  })

  it('gọi plugin MediaStore để lưu ảnh vào album DK Badminton', async () => {
    const message = await saveSessionResultImage(
      'data:image/png;base64,YWJj',
      'DK-Badminton-2026-08-25-090507.png',
    )

    expect(mocks.savePng).toHaveBeenCalledWith({
      data: 'YWJj',
      fileName: 'DK-Badminton-2026-08-25-090507.png',
      album: 'DK Badminton',
    })
    expect(message).toBe('Đã lưu ảnh vào Thư viện.')
  })
})
