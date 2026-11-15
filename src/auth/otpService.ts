import { Capacitor, CapacitorHttp } from '@capacitor/core'

export type OtpAction = 'sendOtp' | 'verifyOtp'

type OtpPayload = {
  action: OtpAction
  email: string
  otp?: string
}

type OtpResponseBase = {
  ok: boolean
  message?: string
  code?: string
  retryAfter?: number
  remainingAttempts?: number
}

export type SendOtpResult = {
  expiresIn: number
  resendAfter: number
  message: string
}

export type VerifyOtpResult = {
  verified: true
  message: string
}

export type OtpTransport = (payload: OtpPayload) => Promise<unknown>

export class OtpServiceError extends Error {
  readonly code: string
  readonly retryAfter?: number
  readonly remainingAttempts?: number

  constructor(message: string, code = 'OTP_ERROR', details?: Pick<OtpResponseBase, 'retryAfter' | 'remainingAttempts'>) {
    super(message)
    this.name = 'OtpServiceError'
    this.code = code
    this.retryAfter = details?.retryAfter
    this.remainingAttempts = details?.remainingAttempts
  }
}

const parseResponse = (value: unknown): OtpResponseBase & Record<string, unknown> => {
  let parsed: unknown
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    throw new OtpServiceError('Phản hồi từ dịch vụ xác minh không hợp lệ.', 'INVALID_RESPONSE')
  }
  if (!parsed || typeof parsed !== 'object' || typeof (parsed as OtpResponseBase).ok !== 'boolean') {
    throw new OtpServiceError('Phản hồi từ dịch vụ xác minh không hợp lệ.', 'INVALID_RESPONSE')
  }
  return parsed as OtpResponseBase & Record<string, unknown>
}

const createDefaultTransport = (endpoint: string, timeoutMs: number): OtpTransport => async (payload) => {
  if (!endpoint) {
    throw new OtpServiceError('Dịch vụ xác minh Gmail chưa được cấu hình.', 'NOT_CONFIGURED')
  }

  const requestUrl = !Capacitor.isNativePlatform() && import.meta.env.DEV ? '/api/otp' : endpoint

  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: requestUrl,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      })
      return response.data
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } finally {
      window.clearTimeout(timeout)
    }
  } catch (reason) {
    if (reason instanceof OtpServiceError) throw reason
    throw new OtpServiceError(
      'Không thể kết nối dịch vụ xác minh. Hãy kiểm tra Internet và thử lại.',
      'NETWORK_ERROR',
    )
  }
}

export class OtpService {
  private readonly transport: OtpTransport

  constructor(endpoint: string, transport?: OtpTransport, timeoutMs = 15_000) {
    this.transport = transport ?? createDefaultTransport(endpoint.trim(), timeoutMs)
  }

  async sendOtp(email: string): Promise<SendOtpResult> {
    const response = parseResponse(await this.transport({ action: 'sendOtp', email: email.trim().toLowerCase() }))
    if (!response.ok) this.throwResponseError(response)
    return {
      expiresIn: Number(response.expiresIn ?? 300),
      resendAfter: Number(response.resendAfter ?? 60),
      message: String(response.message ?? 'Mã xác minh đã được gửi.'),
    }
  }

  async verifyOtp(email: string, otp: string): Promise<VerifyOtpResult> {
    const response = parseResponse(await this.transport({
      action: 'verifyOtp',
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    }))
    if (!response.ok) this.throwResponseError(response)
    if (response.verified !== true) {
      throw new OtpServiceError('Dịch vụ chưa xác nhận mã OTP.', 'NOT_VERIFIED')
    }
    return {
      verified: true,
      message: String(response.message ?? 'Xác minh Gmail thành công.'),
    }
  }

  private throwResponseError(response: OtpResponseBase): never {
    throw new OtpServiceError(
      response.message ?? 'Không thể xác minh Gmail.',
      response.code ?? 'OTP_ERROR',
      response,
    )
  }
}
