export const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <div className={`brand-mark${compact ? ' brand-mark--compact' : ''}`} aria-label="DK Badminton">
    <span className="brand-mark__icon" aria-hidden="true">
      <img src="/logo.jpg" alt="DK Badminton logo" className="brand-mark__logo-img" />
    </span>
    <span>
      <strong>DK</strong>
      <small>Badminton</small>
    </span>
  </div>
)
