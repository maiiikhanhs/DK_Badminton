import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { toPng } from 'html-to-image'

type SaveImagePlugin = {
  savePng(options: { data: string; fileName: string; album: string }): Promise<{ uri: string }>
}

const SaveImage = registerPlugin<SaveImagePlugin>('SaveImage')
let previousCacheFile = ''

const stripDataUrl = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex < 0) throw new Error('Dữ liệu ảnh không hợp lệ.')
  return dataUrl.slice(commaIndex + 1)
}

const waitForImages = async (node: HTMLElement) => {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((image) => {
    if (image.complete) {
      return image.naturalWidth > 0
        ? Promise.resolve()
        : Promise.reject(new Error('Không thể tải logo hoặc QR nhận tiền.'))
    }

    return new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => reject(new Error('Không thể tải logo hoặc QR nhận tiền.')), { once: true })
    })
  }))
}

export const buildShareFileName = (playDate: string, now = new Date()) => {
  const stamp = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join('')
  return `DK-Badminton-${playDate}-${stamp}.png`
}

export const generateSessionResultImage = async (node: HTMLElement) => {
  await document.fonts?.ready
  await waitForImages(node)
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  return toPng(node, {
    width: 1080,
    height: node.scrollHeight,
    canvasWidth: 1080,
    canvasHeight: node.scrollHeight,
    backgroundColor: '#f7f4e9',
    cacheBust: true,
    pixelRatio: 1,
  })
}

const downloadImage = (dataUrl: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
}

const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: 'image/png' })
}

export const shareSessionResultImage = async (
  dataUrl: string,
  fileName: string,
  formattedDate: string,
): Promise<string> => {
  if (Capacitor.isNativePlatform()) {
    if (previousCacheFile) {
      await Filesystem.deleteFile({ path: previousCacheFile, directory: Directory.Cache }).catch(() => undefined)
    }

    await Filesystem.writeFile({
      path: fileName,
      directory: Directory.Cache,
      data: stripDataUrl(dataUrl),
    })
    previousCacheFile = fileName
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
    await Share.share({
      title: `Kết quả buổi chơi ${formattedDate}`,
      text: `Kết quả buổi chơi DK Badminton ngày ${formattedDate}`,
      files: [uri],
      dialogTitle: 'Chia sẻ kết quả',
    })
    return ''
  }

  const file = await dataUrlToFile(dataUrl, fileName)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `Kết quả buổi chơi ${formattedDate}`,
      text: `Kết quả buổi chơi DK Badminton ngày ${formattedDate}`,
      files: [file],
    })
    return ''
  }

  downloadImage(dataUrl, fileName)
  return 'Trình duyệt không hỗ trợ chia sẻ ảnh. Ảnh đã được tải xuống.'
}

export const saveSessionResultImage = async (dataUrl: string, fileName: string): Promise<string> => {
  if (Capacitor.isNativePlatform()) {
    await SaveImage.savePng({
      data: stripDataUrl(dataUrl),
      fileName,
      album: 'DK Badminton',
    })
    return 'Đã lưu ảnh vào Thư viện.'
  }

  downloadImage(dataUrl, fileName)
  return 'Đã tải ảnh xuống máy.'
}
