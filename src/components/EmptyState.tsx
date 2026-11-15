import { Feather } from 'lucide-react'

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) => (
  <div className="empty-state">
    <span className="empty-state__icon"><Feather /></span>
    <h2>{title}</h2>
    <p>{description}</p>
    {action}
  </div>
)
