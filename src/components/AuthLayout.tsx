import type { PropsWithChildren } from 'react'
import { BrandMark } from './BrandMark'

export const AuthLayout = ({ children }: PropsWithChildren) => (
  <main className="auth-layout">
    <div className="court-lines" aria-hidden="true"><i /><i /><i /></div>
    <section className="auth-intro">
      <BrandMark />
      <p>Chia tiền gọn<br />Đánh cầu vui.</p>
    </section>
    <section className="auth-card">{children}</section>
  </main>
)
