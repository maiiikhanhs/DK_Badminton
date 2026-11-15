import { AuthService } from './auth/authService'
import { db } from './data/database'
import { SessionRepository } from './data/sessionRepository'
import { ShuttleInventoryRepository } from './data/shuttleInventoryRepository'
import { PaymentQrRepository } from './data/paymentQrRepository'
import { OtpService } from './auth/otpService'

export const authService = new AuthService(db)
export const sessionRepository = new SessionRepository(db)
export const shuttleInventoryRepository = new ShuttleInventoryRepository(db)
export const paymentQrRepository = new PaymentQrRepository(db)
export const otpService = new OtpService(import.meta.env.VITE_OTP_ENDPOINT ?? '')
