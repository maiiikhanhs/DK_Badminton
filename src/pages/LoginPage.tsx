import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { getErrorMessage } from '../shared/format'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Nhập email.').email('Email không hợp lệ.'),
  password: z.string().min(1, 'Nhập mật khẩu.'),
})

type LoginForm = z.infer<typeof loginSchema>

export const LoginPage = () => {
  const { login } = useAuth()
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('')
    try {
      await login(values.email, values.password)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể đăng nhập.'))
    }
  })

  return (
    <AuthLayout>
      <p className="eyebrow">Chào mừng trở lại</p>
      <h1>Đăng nhập</h1>
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Email</span>
          <div className="field__control"><Mail /><input type="email" autoComplete="email" placeholder="ban@vidu.vn" {...register('email')} /></div>
          {errors.email && <small className="field__error">{errors.email.message}</small>}
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <div className="field__control"><LockKeyhole /><input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} /></div>
          {errors.password && <small className="field__error">{errors.password.message}</small>}
        </label>
        <Link className="forgot-password-link" to="/forgot-password">Quên mật khẩu?</Link>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}
        <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang kiểm tra...' : 'Vào sân'} <ArrowRight />
        </button>
      </form>
      <p className="auth-switch">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
    </AuthLayout>
  )
}
