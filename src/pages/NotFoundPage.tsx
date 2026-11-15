import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <main className="not-found">
    <span>404</span>
    <h1>Quả cầu bay ra ngoài sân.</h1>
    <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
    <Link className="button button--primary" to="/home">Về trang chủ</Link>
  </main>
)
