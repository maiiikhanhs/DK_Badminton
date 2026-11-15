import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, RefreshCw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { otpService } from '../services'
import { getErrorMessage } from '../shared/format'

const gmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Nhập Gmail.')
    .email('Gmail không hợp lệ.')
    .refine((value) => /^[a-z0-9._%+-]+@gmail\.com$/i.test(value), 'Chỉ hỗ trợ địa chỉ @gmail.com.'),
})

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Mật khẩu mới cần ít nhất 8 ký tự.'),
    confirmPassword: z.string().min(1, 'Nhập lại mật khẩu mới.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại chưa khớp.',
  })

type GmailForm = z.infer<typeof gmailSchema>
type PasswordForm = z.infer<typeof passwordSchema>
type RecoveryStep = 'email' | 'otp' | 'password'

const STEP_COPY: Record<RecoveryStep, { eyebrow: string; title: string }> = {
  email: { eyebrow: 'Khôi phục trên thiết bị này', title: 'Quên mật khẩu' },
  otp: { eyebrow: 'Kiểm tra hộp thư Gmail', title: 'Nhập mã OTP' },
  password: { eyebrow: 'Xác minh thành công', title: 'Mật khẩu mới' },
}

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const { isEmailRegistered, resetPassword } = useAuth()
  const [step, setStep] = useState<RecoveryStep>('email')
  const [pendingEmail, setPendingEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const gmailForm = useForm<GmailForm>({ resolver: zodResolver(gmailSchema) })
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const sendOtp = gmailForm.handleSubmit(async ({ email }) => {
    setSubmitError('')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (!(await isEmailRegistered(normalizedEmail))) {
        setSubmitError('Không tìm thấy tài khoản Gmail này trên thiết bị.')
        return
      }
      const result = await otpService.sendOtp(normalizedEmail)
      setPendingEmail(normalizedEmail)
      setResendIn(result.resendAfter)
      setStep('otp')
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể gửi mã xác minh.'))
    }
  })

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault()
    if (verifying) return
    setSubmitError('')
    if (!/^\d{6}$/.test(otp)) {
      setSubmitError('Mã xác minh phải gồm 6 chữ số.')
      return
    }
    setVerifying(true)
    try {
      await otpService.verifyOtp(pendingEmail, otp)
      setStep('password')
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể xác minh Gmail.'))
    } finally {
      setVerifying(false)
    }
  }

  const resendOtp = async () => {
    if (resendIn > 0) return
    setSubmitError('')
    try {
      const result = await otpService.sendOtp(pendingEmail)
      setOtp('')
      setResendIn(result.resendAfter)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể gửi lại mã xác minh.'))
    }
  }

  const savePassword = passwordForm.handleSubmit(async ({ password }) => {
    if (resetting) return
    setSubmitError('')
    setResetting(true)
    window.sessionStorage.setItem('dk-password-reset-success', '1')
    try {
      await resetPassword(pendingEmail, password)
      navigate('/home', { replace: true, state: { passwordReset: true } })
    } catch {
      window.sessionStorage.removeItem('dk-password-reset-success')
      setOtp('')
      setResendIn(0)
      setStep('otp')
      setSubmitError('Không thể lưu mật khẩu mới. Hãy gửi và xác minh một mã OTP mới.')
    } finally {
      setResetting(false)
    }
  })

  const editEmail = () => {
    setStep('email')
    setPendingEmail('')
    setOtp('')
    setResendIn(0)
    setSubmitError('')
    passwordForm.reset()
  }

  const requireNewOtp = () => {
    setStep('otp')
    setOtp('')
    setResendIn(0)
    setSubmitError('Mã trước đã được sử dụng. Hãy gửi mã mới để xác minh lại.')
    passwordForm.reset()
  }

  const copy = STEP_COPY[step]

  return (
    <AuthLayout>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>

      {step === 'email' && (
        <form className="form-stack" onSubmit={sendOtp} noValidate>
          <p className="recovery-copy">Nhập Gmail của tài khoản đã lưu trên điện thoại này.</p>
          <label className="field">
            <span>Gmail</span>
            <div className="field__control"><Mail /><input type="email" autoComplete="email" placeholder="ban@gmail.com" autoFocus {...gmailForm.register('email')} /></div>
            {gmailForm.formState.errors.email && <small className="field__error">{gmailForm.formState.errors.email.message}</small>}
          </label>
          {submitError && <div className="form-alert" role="alert">{submitError}</div>}
          <button className="button button--primary button--wide" type="submit" disabled={gmailForm.formState.isSubmitting}>
            {gmailForm.formState.isSubmitting ? 'Đang gửi mã...' : 'Gửi mã xác minh'} <ArrowRight />
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form className="form-stack" onSubmit={verifyOtp} noValidate>
          <p className="otp-email">Mã 6 số đã được gửi tới <strong>{pendingEmail}</strong></p>
          <label className="field otp-input">
            <span>Mã xác minh</span>
            <div className="field__control"><KeyRound /><input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus /></div>
          </label>
          <small className="otp-help">Mã có hiệu lực trong 5 phút.</small>
          {submitError && <div className="form-alert" role="alert">{submitError}</div>}
          <button className="button button--primary button--wide" type="submit" disabled={verifying}>
            {verifying ? 'Đang xác minh...' : 'Xác minh mã OTP'} <ArrowRight />
          </button>
          <div className="otp-actions">
            <button className="text-button" type="button" onClick={editEmail}><ArrowLeft /> Đổi Gmail</button>
            <button className="text-button" type="button" onClick={resendOtp} disabled={resendIn > 0}>
              <RefreshCw /> {resendIn > 0 ? `Gửi lại sau ${resendIn}s` : 'Gửi lại mã'}
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form className="form-stack" onSubmit={savePassword} noValidate>
          <p className="recovery-copy">Đặt mật khẩu mới cho <strong>{pendingEmail}</strong>.</p>
          <label className="field">
            <span>Mật khẩu mới</span>
            <div className="field__control"><LockKeyhole /><input type="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" autoFocus {...passwordForm.register('password')} /></div>
            {passwordForm.formState.errors.password && <small className="field__error">{passwordForm.formState.errors.password.message}</small>}
          </label>
          <label className="field">
            <span>Nhập lại mật khẩu mới</span>
            <div className="field__control"><LockKeyhole /><input type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" {...passwordForm.register('confirmPassword')} /></div>
            {passwordForm.formState.errors.confirmPassword && <small className="field__error">{passwordForm.formState.errors.confirmPassword.message}</small>}
          </label>
          {submitError && <div className="form-alert" role="alert">{submitError}</div>}
          <button className="button button--primary button--wide" type="submit" disabled={resetting}>
            {resetting ? 'Đang lưu...' : 'Đặt mật khẩu mới'} <ArrowRight />
          </button>
          <button className="text-button recovery-back" type="button" onClick={requireNewOtp}><ArrowLeft /> Xác minh lại</button>
        </form>
      )}

      <p className="auth-switch">Nhớ mật khẩu? <Link to="/login">Quay lại đăng nhập</Link></p>
    </AuthLayout>
  )
}
