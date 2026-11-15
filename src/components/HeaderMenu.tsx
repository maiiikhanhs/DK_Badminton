import { Archive, BookOpenText, ChevronRight, CircleUserRound, LogOut, Menu } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export const HeaderMenu = () => {
  const { account, logout } = useAuth()
  const { pathname } = useLocation()
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const open = openedAtPath === pathname

  useEffect(() => {
    if (!open) return

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenedAtPath(null)
    }
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenedAtPath(null)
    }

    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithKeyboard)
    }
  }, [open])

  const signOut = async () => {
    setOpenedAtPath(null)
    await logout()
  }

  return (
    <div className="header-menu" ref={rootRef}>
      <button
        className="header-menu__trigger"
        type="button"
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="header-actions"
        onClick={() => setOpenedAtPath(open ? null : pathname)}
      >
        <Menu />
      </button>

      {open && (
        <div className="header-menu__panel" id="header-actions" role="menu">
          <p>Tùy chọn</p>
          {account && (
            <div className="header-menu__account" role="presentation">
              <CircleUserRound aria-hidden="true" />
              <span>
                <strong>Thông tin tài khoản</strong>
                <small>{account.email}</small>
              </span>
            </div>
          )}
          <Link className="header-menu__item" to="/inventory" role="menuitem" onClick={() => setOpenedAtPath(null)}>
            <span><Archive /> Kho cầu</span>
            <ChevronRight />
          </Link>
          <Link className="header-menu__item" to="/rules" role="menuitem" onClick={() => setOpenedAtPath(null)}>
            <span><BookOpenText /> Luật chơi</span>
            <ChevronRight />
          </Link>
          <button
            className="header-menu__item header-menu__item--danger"
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
          >
            <span><LogOut /> Đăng xuất</span>
            <ChevronRight />
          </button>
        </div>
      )}
    </div>
  )
}
