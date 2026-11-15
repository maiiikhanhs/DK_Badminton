export type CourtMode = 'singles' | 'doubles'

const courtByMode = {
  singles: {
    sideStart: 54,
    sideEnd: 306,
    serviceTop: 30,
    serviceBottom: 570,
    label: 'đánh đơn',
  },
  doubles: {
    sideStart: 30,
    sideEnd: 330,
    serviceTop: 70,
    serviceBottom: 530,
    label: 'đánh đôi',
  },
} as const

export const CourtDiagram = ({ mode }: { mode: CourtMode }) => {
  const court = courtByMode[mode]
  const halfWidth = (court.sideEnd - court.sideStart) / 2
  const rightCenter = 180 + halfWidth / 2
  const leftCenter = court.sideStart + halfWidth / 2
  const titleId = `court-title-${mode}`
  const descriptionId = `court-description-${mode}`
  const markerId = `serve-arrow-${mode}`

  return (
    <figure className="court-figure">
      <svg
        className="court-diagram"
        viewBox="0 0 360 600"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>Sơ đồ sân {court.label}</title>
        <desc id={descriptionId}>
          Vùng xanh là phạm vi đánh cầu. Vùng màu vàng là các ô giao cầu hợp lệ. Mũi tên thể hiện giao cầu chéo sân.
        </desc>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <pattern id={`court-grain-${mode}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 10 10 0" stroke="rgba(255,255,255,.035)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect className="court-diagram__ground" x="18" y="18" width="324" height="564" rx="8" />
        <rect
          className="court-diagram__play-area"
          x={court.sideStart}
          y="30"
          width={court.sideEnd - court.sideStart}
          height="540"
        />
        <rect x="18" y="18" width="324" height="564" rx="8" fill={`url(#court-grain-${mode})`} />

        <g className="court-diagram__service-zones">
          <rect x={court.sideStart} y={court.serviceTop} width={halfWidth} height={220 - court.serviceTop} />
          <rect x="180" y={court.serviceTop} width={halfWidth} height={220 - court.serviceTop} />
          <rect x={court.sideStart} y="380" width={halfWidth} height={court.serviceBottom - 380} />
          <rect x="180" y="380" width={halfWidth} height={court.serviceBottom - 380} />
        </g>

        <g className="court-diagram__lines">
          <rect x="30" y="30" width="300" height="540" />
          <line x1="54" y1="30" x2="54" y2="570" />
          <line x1="306" y1="30" x2="306" y2="570" />
          <line x1="30" y1="70" x2="330" y2="70" />
          <line x1="30" y1="220" x2="330" y2="220" />
          <line x1="30" y1="380" x2="330" y2="380" />
          <line x1="30" y1="530" x2="330" y2="530" />
          <line x1="180" y1="30" x2="180" y2="220" />
          <line x1="180" y1="380" x2="180" y2="570" />
          <line className="court-diagram__net" x1="18" y1="300" x2="342" y2="300" />
        </g>

        <g className="court-diagram__labels">
          <text x={leftCenter} y="430">Ô trái</text>
          <text className="court-diagram__score-label" x={leftCenter} y="448">ĐIỂM LẺ</text>
          <text x={rightCenter} y="430">Ô phải</text>
          <text className="court-diagram__score-label" x={rightCenter} y="448">ĐIỂM CHẴN · 0</text>
          <text className="court-diagram__net-label" x="180" y="292">LƯỚI</text>
        </g>

        <path
          className="court-diagram__serve-arrow"
          d={`M ${rightCenter} 475 Q 180 300 ${leftCenter} 150`}
          markerEnd={`url(#${markerId})`}
        />
        <circle className="court-diagram__server" cx={rightCenter} cy="475" r="9" />
      </svg>

      <figcaption className="court-legend">
        <span><i className="court-legend__play" /> Phạm vi đánh</span>
        <span><i className="court-legend__serve" /> Phạm vi phát</span>
        <span><i className="court-legend__line" /> Phát chéo</span>
      </figcaption>
    </figure>
  )
}
