import { BrandMark } from './BrandMark'

export const LoadingScreen = ({ label = 'Đang chuẩn bị sân...' }: { label?: string }) => (
  <main className="loading-screen" aria-live="polite">
    <BrandMark />
    <div className="loading-line" />
    <p>{label}</p>
  </main>
)
