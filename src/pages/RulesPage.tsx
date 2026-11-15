import { BadgeCheck, Repeat2, Trophy, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { CourtDiagram, type CourtMode } from '../components/CourtDiagram'
import { PageHeader } from '../components/PageHeader'

const modes: Array<{ value: CourtMode; label: string }> = [
  { value: 'singles', label: 'Đánh đơn' },
  { value: 'doubles', label: 'Đánh đôi' },
]

export const RulesPage = () => {
  const [mode, setMode] = useState<CourtMode>('singles')
  const isSingles = mode === 'singles'

  return (
    <div className="page page--rules">
      <PageHeader title="Luật chơi" back />

      <section className="rules-intro">
        <span>Luật sân tiêu chuẩn</span>
        <h2>Nhìn sân là hiểu luật.</h2>
      </section>

      <div className="rules-tabs" role="tablist" aria-label="Chọn nội dung luật chơi">
        {modes.map((item) => (
          <button
            id={`rules-tab-${item.value}`}
            className={mode === item.value ? 'rules-tabs__item rules-tabs__item--active' : 'rules-tabs__item'}
            type="button"
            role="tab"
            aria-selected={mode === item.value}
            aria-controls={`rules-panel-${item.value}`}
            tabIndex={mode === item.value ? 0 : -1}
            onClick={() => setMode(item.value)}
            key={item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="rules-panel"
        id={`rules-panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`rules-tab-${mode}`}
      >
        <CourtDiagram mode={mode} />

        <section className="court-note">
          <BadgeCheck />
          <div>
            <strong>{isSingles ? 'Sân hẹp, phát dài' : 'Sân rộng, phát ngắn hơn'}</strong>
            <p>
              {isSingles
                ? 'Đánh trong biên dọc phía trong. Khi phát cầu, vùng hợp lệ kéo dài tới đường biên cuối sân.'
                : 'Đánh trên toàn bộ sân. Khi phát cầu, cầu phải rơi trước vạch phát cầu dài dành cho đánh đôi.'}
            </p>
          </div>
        </section>

        <section className="service-parity" aria-label="Ô phát cầu theo điểm số">
          <article>
            <span>0 · 2 · 4 · 6...</span>
            <strong>Điểm chẵn</strong>
            <p>Phát từ ô bên phải sang ô chéo đối diện.</p>
          </article>
          <article>
            <span>1 · 3 · 5 · 7...</span>
            <strong>Điểm lẻ</strong>
            <p>Phát từ ô bên trái sang ô chéo đối diện.</p>
          </article>
        </section>

        <section className="rules-card">
          <div className="rules-card__heading"><Trophy /><div><span>Cách tính điểm</span><h2>21 điểm một game</h2></div></div>
          <ul>
            <li>Mỗi pha cầu kết thúc đều có một điểm.</li>
            <li>20–20: phải dẫn trước 2 điểm để thắng game.</li>
            <li>29–29: bên ghi điểm thứ 30 thắng game.</li>
            <li>Thắng 2 trong tối đa 3 game là thắng trận.</li>
          </ul>
        </section>

        <section className="rules-card">
          <div className="rules-card__heading"><Repeat2 /><div><span>Đổi sân</span><h2>Giữ trận đấu công bằng</h2></div></div>
          <ul>
            <li>Đổi sân sau khi kết thúc mỗi game.</li>
            <li>Trong game thứ ba, đổi sân khi bên dẫn đạt 11 điểm.</li>
          </ul>
        </section>

        {!isSingles && (
          <section className="rules-card rules-card--accent">
            <div className="rules-card__heading"><UsersRound /><div><span>Riêng đánh đôi</span><h2>Luân chuyển quyền phát</h2></div></div>
            <ul>
              <li>Mỗi bên chỉ có một lượt giao cầu.</li>
              <li>Bên giao thắng pha: cùng người tiếp tục giao từ ô còn lại.</li>
              <li>Bên nhận thắng pha: được một điểm và giành quyền giao.</li>
            </ul>
          </section>
        )}

        <p className="rules-source">Tóm tắt theo Laws of Badminton, BWF Section 4.1.</p>
      </div>
    </div>
  )
}
