import { CalendarDays, CirclePlus, House } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { HeaderMenu } from './HeaderMenu'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`

export const AppShell = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <BrandMark compact />
        <HeaderMenu />
      </header>
      <main className="app-content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Điều hướng chính">
        <NavLink className={navClass} to="/home">
          <House />
          <span>Trang chủ</span>
        </NavLink>
        <NavLink className={navClass} to="/sessions/new">
          <span className="bottom-nav__create"><CirclePlus /></span>
          <span>Tạo buổi</span>
        </NavLink>
        <NavLink className={navClass} to="/history">
          <CalendarDays />
          <span>Lịch sử</span>
        </NavLink>
      </nav>
    </div>
  )
}
