import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, Edit3, PackagePlus, Plus, Save, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import type { BadmintonSession } from '../domain/session'
import type { ShuttleInventorySummary, ShuttleInventoryTransaction } from '../domain/shuttleInventory'
import { sessionRepository, shuttleInventoryRepository } from '../services'
import { formatDate, formatVnd, getErrorMessage } from '../shared/format'

const inventorySchema = z.object({
  quantity: z.number({ error: 'Số cầu nạp phải là một số.' }).int('Số cầu nạp phải là số nguyên.').positive('Số cầu nạp phải lớn hơn 0.'),
  unitPrice: z.number({ error: 'Giá một quả phải là một số.' }).int('Giá một quả phải là số nguyên.').positive('Giá một quả phải lớn hơn 0.'),
})

type InventoryFormValues = z.infer<typeof inventorySchema>

const emptySummary: ShuttleInventorySummary = {
  availableCount: 0,
  usedCount: 0,
  latestUnitPrice: null,
}

const formatTransactionTime = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

export const InventoryPage = () => {
  const { account } = useAuth()
  const [summary, setSummary] = useState(emptySummary)
  const [transactions, setTransactions] = useState<ShuttleInventoryTransaction[]>([])
  const [sessions, setSessions] = useState<BadmintonSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShuttleInventoryTransaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState<ShuttleInventoryTransaction | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { quantity: 0, unitPrice: 0 },
  })

  const sessionById = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  )

  const loadInventory = useCallback(async () => {
    if (!account) return
    setError('')
    try {
      const [nextSummary, nextTransactions, nextSessions] = await Promise.all([
        shuttleInventoryRepository.getSummary(account.id),
        shuttleInventoryRepository.listTransactions(account.id),
        sessionRepository.list(account.id),
      ])
      setSummary(nextSummary)
      setTransactions(nextTransactions)
      setSessions(nextSessions)
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể đọc kho cầu.'))
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => {
    if (!account) return
    let active = true
    Promise.all([
      shuttleInventoryRepository.getSummary(account.id),
      shuttleInventoryRepository.listTransactions(account.id),
      sessionRepository.list(account.id),
    ])
      .then(([nextSummary, nextTransactions, nextSessions]) => {
        if (!active) return
        setSummary(nextSummary)
        setTransactions(nextTransactions)
        setSessions(nextSessions)
      })
      .catch((reason) => {
        if (active) setError(getErrorMessage(reason, 'Không thể đọc kho cầu.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [account])

  const openRestockForm = (transaction?: ShuttleInventoryTransaction) => {
    setEditing(transaction ?? null)
    reset({
      quantity: transaction?.quantityDelta ?? 0,
      unitPrice: transaction?.unitPrice ?? summary.latestUnitPrice ?? 0,
    })
    setSuccess('')
    setError('')
    setFormOpen(true)
  }

  const closeRestockForm = () => {
    setFormOpen(false)
    setEditing(null)
    reset({ quantity: 0, unitPrice: summary.latestUnitPrice ?? 0 })
  }

  const submitRestock = handleSubmit(async ({ quantity, unitPrice }) => {
    if (!account) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (editing) {
        await shuttleInventoryRepository.updateRestock(account.id, editing.id, quantity, unitPrice)
        setSuccess('Đã cập nhật lần nạp cầu.')
      } else {
        await shuttleInventoryRepository.restock(account.id, quantity, unitPrice)
        setSuccess(`Đã nạp thêm ${quantity} quả cầu.`)
      }
      closeRestockForm()
      await loadInventory()
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể cập nhật kho cầu.'))
    } finally {
      setSaving(false)
    }
  })

  const removeRestock = async () => {
    if (!account || !confirmingDelete) return
    setDeleting(true)
    setError('')
    try {
      await shuttleInventoryRepository.deleteRestock(account.id, confirmingDelete.id)
      setConfirmingDelete(null)
      setSuccess('Đã xóa lần nạp cầu.')
      await loadInventory()
    } catch (reason) {
      setConfirmingDelete(null)
      setError(getErrorMessage(reason, 'Không thể xóa lần nạp cầu.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page page--inventory">
      <PageHeader title="Kho cầu" back />

      <section className="inventory-summary" aria-label="Tổng quan kho cầu">
        <article className="inventory-summary__available">
          <Archive />
          <span>Cầu đang có</span>
          <strong>{summary.availableCount}</strong>
          <small>{summary.latestUnitPrice === null ? 'Chưa có giá kho' : `${formatVnd(summary.latestUnitPrice)} / quả`}</small>
        </article>
        <article>
          <span>Cầu đã đánh</span>
          <strong>{summary.usedCount}</strong>
          <small>Chỉ tính từ kho của tôi</small>
        </article>
      </section>

      <button className="inventory-restock-trigger" type="button" onClick={() => openRestockForm()}>
        <span><PackagePlus /><strong>Nạp thêm cầu</strong><small>Cập nhật số lượng và giá mới nhất</small></span>
        <Plus />
      </button>

      {formOpen && (
        <form className="inventory-form" onSubmit={submitRestock} noValidate>
          <div className="inventory-form__heading">
            <div><p className="eyebrow">{editing ? 'Chỉnh sửa giao dịch' : 'Cập nhật kho'}</p><h2>{editing ? 'Sửa lần nạp' : 'Nạp cầu mới'}</h2></div>
            <button className="text-button" type="button" onClick={closeRestockForm}>Đóng</button>
          </div>
          <div className="form-grid">
            <label className="field field--number">
              <span>Số cầu nạp</span>
              <div className="field__control"><input type="number" min="1" step="1" inputMode="numeric" {...register('quantity', { valueAsNumber: true })} /><b>quả</b></div>
              {errors.quantity && <small className="field__error">{errors.quantity.message}</small>}
            </label>
            <label className="field field--number">
              <span>Giá một quả</span>
              <div className="field__control"><input type="number" min="1" step="1000" inputMode="numeric" {...register('unitPrice', { valueAsNumber: true })} /><b>đ</b></div>
              {errors.unitPrice && <small className="field__error">{errors.unitPrice.message}</small>}
            </label>
          </div>
          <button className="button button--primary button--wide" type="submit" disabled={saving}><Save /> {saving ? 'Đang lưu...' : editing ? 'Lưu chỉnh sửa' : 'Nạp vào kho'}</button>
        </form>
      )}

      {success && <div className="success-banner" role="status">{success}</div>}
      {error && <div className="form-alert" role="alert">{error}</div>}

      <section className="inventory-history">
        <div className="section-heading"><div><p className="eyebrow">Sổ giao dịch</p><h2>Lịch sử kho</h2></div></div>
        {loading && <div className="skeleton-list"><i /><i /><i /></div>}
        {!loading && transactions.length === 0 && (
          <EmptyState title="Kho chưa có giao dịch" description="Nạp cầu lần đầu để bắt đầu theo dõi số lượng." />
        )}
        {!loading && transactions.length > 0 && (
          <div className="inventory-list">
            {transactions.map((transaction) => {
              const session = transaction.sessionId ? sessionById.get(transaction.sessionId) : undefined
              return (
                <article className={`inventory-entry inventory-entry--${transaction.kind}`} key={transaction.id}>
                  <div className="inventory-entry__amount"><span>{transaction.quantityDelta > 0 ? '+' : '−'}</span><strong>{Math.abs(transaction.quantityDelta)}</strong><small>quả</small></div>
                  <div className="inventory-entry__copy">
                    <strong>{transaction.kind === 'restock' ? 'Nạp vào kho' : 'Dùng cho buổi chơi'}</strong>
                    <small>{session ? formatDate(session.playDate) : formatTransactionTime(transaction.createdAt)} · {formatVnd(transaction.unitPrice)}/quả</small>
                  </div>
                  {transaction.kind === 'restock' ? (
                    <div className="inventory-entry__actions">
                      <button type="button" aria-label="Sửa lần nạp" onClick={() => openRestockForm(transaction)}><Edit3 /></button>
                      <button type="button" aria-label="Xóa lần nạp" onClick={() => setConfirmingDelete(transaction)}><Trash2 /></button>
                    </div>
                  ) : transaction.sessionId ? (
                    <Link className="inventory-entry__link" to={`/sessions/${transaction.sessionId}`}>Xem</Link>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {confirmingDelete && createPortal(
        <div className="modal-backdrop" role="presentation" onClick={() => !deleting && setConfirmingDelete(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-restock-title" onClick={(event) => event.stopPropagation()}>
            <span className="confirm-modal__icon"><Trash2 /></span>
            <h2 id="delete-restock-title">Xóa lần nạp cầu?</h2>
            <p>Kho sẽ giảm {confirmingDelete.quantityDelta} quả. App sẽ chặn nếu thay đổi này làm tồn kho bị âm.</p>
            <div><button className="button button--secondary" type="button" onClick={() => setConfirmingDelete(null)} disabled={deleting}>Giữ lại</button><button className="button button--danger" type="button" onClick={removeRestock} disabled={deleting}>{deleting ? 'Đang xóa...' : 'Xóa lần nạp'}</button></div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}
