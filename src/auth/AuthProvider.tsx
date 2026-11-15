import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Account } from './authService'
import { authService } from '../services'
import { AuthContext, type AuthContextValue } from './AuthContext'

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [account, setAccount] = useState<Account | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    let active = true
    authService
      .restoreSession()
      .then((restored) => {
        if (active) setAccount(restored)
      })
      .finally(() => {
        if (active) setBooting(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      booting,
      isEmailRegistered: (email) => authService.isEmailRegistered(email),
      register: async (email, password) => setAccount(await authService.register(email, password)),
      resetPassword: async (email, newPassword) => setAccount(await authService.resetPassword(email, newPassword)),
      login: async (email, password) => setAccount(await authService.login(email, password)),
      logout: async () => {
        await authService.logout()
        setAccount(null)
      },
    }),
    [account, booting],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
