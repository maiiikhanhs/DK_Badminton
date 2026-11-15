import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { RulesPage } from './pages/RulesPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { SessionFormPage } from './pages/SessionFormPage'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/sessions/new" element={<SessionFormPage />} />
          <Route path="/sessions/:id/edit" element={<SessionFormPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
