import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const PageHeader = ({
  eyebrow,
  title,
  back = false,
  action,
}: {
  eyebrow?: string
  title: string
  back?: boolean
  action?: React.ReactNode
}) => {
  const navigate = useNavigate()

  return (
    <header className="page-heading">
      <div className="page-heading__row">
        {back && (
          <button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label="Quay lại">
            <ArrowLeft />
          </button>
        )}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
        {action && <div className="page-heading__action">{action}</div>}
      </div>
    </header>
  )
}
