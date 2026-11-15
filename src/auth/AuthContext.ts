import { createContext } from 'react'
import type { Account } from './authService'

export type AuthContextValue = {
  account: Account | null
  booting: boolean
  isEmailRegistered: (email: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<void>
  resetPassword: (email: string, newPassword: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
