import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, RefreshCw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/useAuth'
import { EmailAlreadyExistsError } from '../auth/authService'
import { AuthLayout } from '../components/AuthLayout'
import { otpService } from '../services'
import { getErrorMessage } from '../shared/format'

const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Nhập Gmail.')
      .email('Gmail không hợp lệ.')
      .refine((value) => /^[a-z0-9._%+-]+@gmail\.com$/i.test(value), 'Chỉ chấp nhận địa chỉ @gmail.com.'),
    password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.'),
    confirmPassword: z.string().min(1, 'Nhập lại mật khẩu.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại chưa khớp.',
  })

type RegisterForm = z.infer<typeof registerSchema>

export const RegisterPage = () => {
  const { isEmailRegistered, register: createAccount } = useAuth()
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [pendingAccount, setPendingAccount] = useState<RegisterForm | null>(null)
  const [otp, setOtp] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('')
    try {
      if (await isEmailRegistered(values.email)) throw new EmailAlreadyExistsError()
      const result = await otpService.sendOtp(values.email)
      setPendingAccount({ ...values, email: values.email.trim().toLowerCase() })
      setResendIn(result.resendAfter)
      setStep('otp')
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể gửi mã xác minh.'))
    }
  })

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault()
    if (!pendingAccount || verifying) return
    setSubmitError('')
    if (!/^\d{6}$/.test(otp)) {
      setSubmitError('Mã xác minh phải gồm 6 chữ số.')
      return
    }
    setVerifying(true)
    try {
      await otpService.verifyOtp(pendingAccount.email, otp)
      await createAccount(pendingAccount.email, pendingAccount.password)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể xác minh Gmail.'))
    } finally {
      setVerifying(false)
    }
  }

  const resendOtp = async () => {
    if (!pendingAccount || resendIn > 0) return
    setSubmitError('')
    try {
      const result = await otpService.sendOtp(pendingAccount.email)
      setResendIn(result.resendAfter)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể gửi lại mã xác minh.'))
    }
  }

  const editEmail = () => {
    setStep('details')
    setPendingAccount(null)
    setOtp('')
    setResendIn(0)
    setSubmitError('')
  }

  return (
    <AuthLayout>
      <p className="eyebrow">{step === 'details' ? 'Bắt đầu trên máy này' : 'Kiểm tra hộp thư Gmail'}</p>
      <h1>{step === 'details' ? 'Tạo tài khoản' : 'Xác minh Gmail'}</h1>
      {step === 'details' ? <form className="form-stack" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Gmail</span>
          <div className="field__control"><Mail /><input type="email" autoComplete="email" placeholder="ban@gmail.com" {...register('email')} /></div>
          {errors.email && <small className="field__error">{errors.email.message}</small>}
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <div className="field__control"><LockKeyhole /><input type="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" {...register('password')} /></div>
          {errors.password && <small className="field__error">{errors.password.message}</small>}
        </label>
        <label className="field">
          <span>Nhập lại mật khẩu</span>
          <div className="field__control"><LockKeyhole /><input type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" {...register('confirmPassword')} /></div>
          {errors.confirmPassword && <small className="field__error">{errors.confirmPassword.message}</small>}
        </label>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}
        <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi mã...' : 'Gửi mã xác minh'} <ArrowRight />
        </button>
      </form> : <form className="form-stack" onSubmit={verifyOtp} noValidate>
        <p className="otp-email">Mã 6 số đã được gửi tới <strong>{pendingAccount?.email}</strong></p>
        <label className="field otp-input">
          <span>Mã xác minh</span>
          <div className="field__control"><KeyRound /><input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus /></div>
        </label>
        <small className="otp-help">Mã có hiệu lực trong 5 phút.</small>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}
        <button className="button button--primary button--wide" type="submit" disabled={verifying}>
          {verifying ? 'Đang xác minh...' : 'Xác minh và tạo tài khoản'} <ArrowRight />
        </button>
        <div className="otp-actions">
          <button className="text-button" type="button" onClick={editEmail}><ArrowLeft /> Đổi Gmail</button>
          <button className="text-button" type="button" onClick={resendOtp} disabled={resendIn > 0}>
            <RefreshCw /> {resendIn > 0 ? `Gửi lại sau ${resendIn}s` : 'Gửi lại mã'}
          </button>
        </div>
      </form>}
      <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </AuthLayout>
  )
}
