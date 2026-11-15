import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoadingScreen } from './LoadingScreen'

export const ProtectedRoute = () => {
  const { account, booting } = useAuth()
  if (booting) return <LoadingScreen />
  return account ? <Outlet /> : <Navigate to="/login" replace />
}

export const PublicOnlyRoute = () => {
  const { account, booting } = useAuth()
  if (booting) return <LoadingScreen />
  return account ? <Navigate to="/home" replace /> : <Outlet />
}
