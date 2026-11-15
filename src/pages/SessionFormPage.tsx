import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, Calculator, CalendarDays, Clock3, PackagePlus, Save, UserRound, UsersRound, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { ResultPanel } from '../components/ResultPanel'
import { MALE_SURCHARGE, SessionValidationError, type SessionCalculation, type SessionInput } from '../domain/session'
import type { ShuttleInventorySummary } from '../domain/shuttleInventory'
import { calculateSession } from '../domain/sessionCalculator'
import { isValidTime } from '../domain/sessionDuration'
import { sessionRepository, shuttleInventoryRepository } from '../services'
import { formatVnd, getErrorMessage, todayLocal } from '../shared/format'

const integerField = (label: string) =>
  z.number({ error: `${label} phải là một số.` }).int(`${label} phải là số nguyên.`).min(0, `${label} không được âm.`)

const timeField = (label: string) =>
  z.string().min(1, `Chọn ${label}.`).refine(isValidTime, `${label} không hợp lệ.`)

const formSchema = z
  .object({
    playDate: z.string().min(1, 'Chọn ngày chơi.'),
    startTime: timeField('giờ bắt đầu'),
    endTime: timeField('giờ kết thúc'),
    note: z.string().max(240, 'Ghi chú tối đa 240 ký tự.'),
    courtCost: integerField('Tiền sân'),
    shuttleCount: integerField('Số cầu'),
    shuttleUnitPrice: integerField('Giá một quả cầu'),
    shuttleSource: z.enum(['inventory', 'external']).optional(),
    maleCount: integerField('Số nam'),
    femaleCount: integerField('Số nữ'),
    hasMeal: z.boolean(),
    mealCost: integerField('Tổng hóa đơn ăn/uống'),
    mealMaleCount: integerField('Số nam đi ăn/uống'),
    mealFemaleCount: integerField('Số nữ đi ăn/uống'),
  })
  .superRefine((values, context) => {
    if (!values.shuttleSource) {
      context.addIssue({ code: 'custom', path: ['shuttleSource'], message: 'Chọn nguồn cầu cho buổi chơi.' })
    }
    if (isValidTime(values.startTime) && values.startTime === values.endTime) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'Giờ kết thúc phải khác giờ bắt đầu.',
      })
    }
    if (!values.hasMeal) return
    if (values.mealCost === 0) {
      context.addIssue({ code: 'custom', path: ['mealCost'], message: 'Tổng hóa đơn ăn/uống phải lớn hơn 0đ.' })
    }
    if (values.mealMaleCount + values.mealFemaleCount === 0) {
      context.addIssue({ code: 'custom', path: ['mealFemaleCount'], message: 'Cần có ít nhất một người đi ăn/uống.' })
    }
    if (values.mealFemaleCount > values.femaleCount) {
      context.addIssue({ code: 'custom', path: ['mealFemaleCount'], message: 'Số nữ đi ăn/uống không được vượt số nữ chơi.' })
    }
    if (values.mealMaleCount > values.maleCount) {
      context.addIssue({ code: 'custom', path: ['mealMaleCount'], message: 'Số nam đi ăn/uống không được vượt số nam chơi.' })
    }
  })

type SessionFormValues = z.infer<typeof formSchema>

const defaults: SessionFormValues = {
  playDate: todayLocal(),
  startTime: '',
  endTime: '',
  note: '',
  courtCost: 0,
  shuttleCount: 0,
  shuttleUnitPrice: 0,
  shuttleSource: undefined,
  maleCount: 0,
  femaleCount: 0,
  hasMeal: false,
  mealCost: 0,
  mealMaleCount: 0,
  mealFemaleCount: 0,
}

const toSessionInput = (values: SessionFormValues): SessionInput => {
  if (!values.shuttleSource) throw new Error('Chưa chọn nguồn cầu.')
  return {
    playDate: values.playDate,
    startTime: values.startTime,
    endTime: values.endTime,
    note: values.note,
    courtCost: values.courtCost,
    shuttleCount: values.shuttleCount,
    shuttleUnitPrice: values.shuttleUnitPrice,
    shuttleSource: values.shuttleSource,
    maleCount: values.maleCount,
    femaleCount: values.femaleCount,
    meal: values.hasMeal
      ? {
          cost: values.mealCost,
          maleCount: values.mealMaleCount,
          femaleCount: values.mealFemaleCount,
        }
      : null,
  }
}

const NumberField = ({
  label,
  suffix,
  error,
  input,
}: {
  label: string
  suffix?: string
  error?: string
  input: React.InputHTMLAttributes<HTMLInputElement>
}) => (
  <label className="field field--number">
    <span>{label}</span>
    <div className="field__control"><input type="number" min="0" inputMode="numeric" {...input} />{suffix && <b>{suffix}</b>}</div>
    {error && <small className="field__error">{error}</small>}
  </label>
)

export const SessionFormPage = () => {
  const { id } = useParams()
  const editing = Boolean(id)
  const { account } = useAuth()
  const navigate = useNavigate()
  const [calculation, setCalculation] = useState<SessionCalculation | null>(null)
  const [domainError, setDomainError] = useState('')
  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [inventorySummary, setInventorySummary] = useState<ShuttleInventorySummary | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [originalInventoryCount, setOriginalInventoryCount] = useState(0)
  const [originalInventoryPrice, setOriginalInventoryPrice] = useState<number | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<SessionFormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults })
  const hasMeal = useWatch({ control, name: 'hasMeal' })
  const shuttleSource = useWatch({ control, name: 'shuttleSource' })
  const effectiveInventoryCount = (inventorySummary?.availableCount ?? 0) + originalInventoryCount
  const canUseInventory = originalInventoryPrice !== null || (
    inventorySummary?.latestUnitPrice !== null && effectiveInventoryCount > 0
  )

  useEffect(() => {
    if (!account) return
    shuttleInventoryRepository
      .getSummary(account.id)
      .then(setInventorySummary)
      .catch((reason) => setDomainError(getErrorMessage(reason, 'Không thể đọc kho cầu.')))
      .finally(() => setInventoryLoading(false))
  }, [account])

  useEffect(() => {
    if (!editing || !id || !account) return
    sessionRepository
      .get(account.id, id)
      .then((session) => {
        reset({
          playDate: session.playDate,
          startTime: session.startTime || '',
          endTime: session.endTime || '',
          note: session.note,
          courtCost: session.courtCost,
          shuttleCount: session.shuttleCount,
          shuttleUnitPrice: session.shuttleUnitPrice,
          shuttleSource: session.shuttleSource || 'external',
          maleCount: session.maleCount,
          femaleCount: session.femaleCount,
          hasMeal: Boolean(session.meal),
          mealCost: session.meal?.cost ?? 0,
          mealMaleCount: session.meal?.maleCount ?? 0,
          mealFemaleCount: session.meal?.femaleCount ?? 0,
        })
        if (session.shuttleSource === 'inventory') {
          setOriginalInventoryCount(session.shuttleCount)
          setOriginalInventoryPrice(session.shuttleUnitPrice)
        }
      })
      .catch((reason) => setLoadError(getErrorMessage(reason, 'Không thể mở buổi chơi.')))
      .finally(() => setLoading(false))
  }, [account, editing, id, reset])

  useEffect(() => {
    if (shuttleSource !== 'inventory') return
    const inventoryPrice = originalInventoryPrice ?? inventorySummary?.latestUnitPrice
    if (inventoryPrice !== null && inventoryPrice !== undefined) {
      setValue('shuttleUnitPrice', inventoryPrice, { shouldDirty: true })
      clearErrors('shuttleUnitPrice')
    }
  }, [clearErrors, inventorySummary?.latestUnitPrice, originalInventoryPrice, setValue, shuttleSource])

  const onCalculate = handleSubmit((values) => {
    setDomainError('')
    try {
      if (values.shuttleSource === 'inventory') {
        if (!canUseInventory) {
          setCalculation(null)
          setDomainError('Kho chưa có cầu. Hãy nạp cầu trước khi tính tiền.')
          return
        }
        if (values.shuttleCount > effectiveInventoryCount) {
          setCalculation(null)
          setError('shuttleCount', {
            type: 'manual',
            message: `Kho chỉ còn ${effectiveInventoryCount} quả cầu.`,
          })
          return
        }
      }
      clearErrors('shuttleCount')
      setCalculation(calculateSession(toSessionInput(values)))
    } catch (error) {
      setCalculation(null)
      setDomainError(
        error instanceof SessionValidationError ? error.message : 'Không thể tính tiền với dữ liệu này.',
      )
    }
  })

  const save = async () => {
    if (!calculation || !account) return
    setSaving(true)
    setDomainError('')
    try {
      const input = toSessionInput(getValues())
      const saved = editing && id
        ? await sessionRepository.update(account.id, id, input, calculation)
        : await sessionRepository.create(account.id, input, calculation)
      navigate(`/sessions/${saved.id}`, { replace: true, state: { saved: true } })
    } catch (error) {
      setDomainError(getErrorMessage(error, 'Không thể lưu buổi chơi.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><div className="skeleton-form"><i /><i /><i /><i /></div></div>

  if (loadError) {
    return <div className="page"><PageHeader title="Không mở được" back /><div className="form-alert">{loadError}</div></div>
  }

  return (
    <div className="page page--form">
      <PageHeader eyebrow={editing ? 'Cập nhật buổi chơi' : 'Buổi chơi mới'} title={editing ? 'Sửa & tính lại' : 'Nhập chi phí'} back />
      <form
        className="session-form"
        onSubmit={onCalculate}
        onChange={() => {
          setCalculation(null)
          setDomainError('')
        }}
        noValidate
      >
        <section className="form-section">
          <div className="form-section__title"><CalendarDays /><div><h2>Thông tin buổi chơi</h2></div></div>
          <label className="field">
            <span>Ngày chơi</span>
            <div className="field__control"><input type="date" {...register('playDate')} /></div>
            {errors.playDate && <small className="field__error">{errors.playDate.message}</small>}
          </label>
          <fieldset className="time-fieldset">
            <legend>Thời gian chơi</legend>
            <div className="form-grid">
              <label className="field">
                <span>Từ</span>
                <div className="field__control"><Clock3 /><input type="time" step="60" {...register('startTime')} /></div>
                {errors.startTime && <small className="field__error">{errors.startTime.message}</small>}
              </label>
              <label className="field">
                <span>Đến</span>
                <div className="field__control"><Clock3 /><input type="time" step="60" {...register('endTime')} /></div>
                {errors.endTime && <small className="field__error">{errors.endTime.message}</small>}
              </label>
            </div>
          </fieldset>
          <label className="field field--note">
            <span>Ghi chú <em>không bắt buộc</em></span>
            <div className="field__control"><textarea rows={1} placeholder="Ví dụ: Sân 2, ca tối..." {...register('note')} /></div>
            {errors.note && <small className="field__error">{errors.note.message}</small>}
          </label>
        </section>

        <section className="form-section">
          <div className="form-section__title"><Calculator /><div><h2>Chi phí</h2></div></div>
          <NumberField label="Tiền sân" suffix="đ" error={errors.courtCost?.message} input={{ step: 1000, ...register('courtCost', { valueAsNumber: true }) }} />
          <fieldset className="shuttle-source-fieldset">
            <legend>Nguồn cầu</legend>
            <div className="shuttle-source-options">
              <label className={`shuttle-source-option${shuttleSource === 'inventory' ? ' shuttle-source-option--active' : ''}${!canUseInventory ? ' shuttle-source-option--disabled' : ''}`}>
                <input type="radio" value="inventory" disabled={inventoryLoading || !canUseInventory} {...register('shuttleSource')} />
                <Archive />
                <span><strong>Kho của tôi</strong><small>{inventoryLoading ? 'Đang đọc kho...' : `${effectiveInventoryCount} quả · ${inventorySummary?.latestUnitPrice === null && originalInventoryPrice === null ? 'chưa có giá' : formatVnd(originalInventoryPrice ?? inventorySummary?.latestUnitPrice ?? 0)}/quả`}</small></span>
              </label>
              <label className={`shuttle-source-option${shuttleSource === 'external' ? ' shuttle-source-option--active' : ''}`}>
                <input type="radio" value="external" {...register('shuttleSource')} />
                <UserRound />
                <span><strong>Người khác mang</strong><small>Không trừ kho của bạn</small></span>
              </label>
            </div>
            {errors.shuttleSource && <small className="field__error">{errors.shuttleSource.message}</small>}
            {!inventoryLoading && !canUseInventory && <Link className="inventory-inline-link" to="/inventory"><PackagePlus /> Nạp cầu vào kho</Link>}
          </fieldset>
          <div className="form-grid">
            <NumberField label="Số cầu" suffix="quả" error={errors.shuttleCount?.message} input={{ step: 1, ...register('shuttleCount', { valueAsNumber: true }) }} />
            <NumberField label="Giá một quả" suffix="đ" error={errors.shuttleUnitPrice?.message} input={{ step: 1000, readOnly: shuttleSource === 'inventory', 'aria-readonly': shuttleSource === 'inventory', ...register('shuttleUnitPrice', { valueAsNumber: true }) }} />
          </div>
          {shuttleSource === 'inventory' && <p className="form-hint">Giá cầu được lấy từ kho và không thể sửa trong buổi chơi.</p>}
        </section>

        <section className="form-section">
          <div className="form-section__title"><UsersRound /><div><h2>Người chơi</h2></div></div>
          <div className="form-grid">
            <NumberField label="Số nữ" suffix="người" error={errors.femaleCount?.message} input={{ step: 1, ...register('femaleCount', { valueAsNumber: true }) }} />
            <NumberField label="Số nam" suffix="người" error={errors.maleCount?.message} input={{ step: 1, ...register('maleCount', { valueAsNumber: true }) }} />
          </div>
          <p className="form-hint">Khi có cả nam và nữ, nam đóng nhiều hơn nữ 15.000đ.</p>
        </section>

        <section className={`form-section form-section--meal${hasMeal ? ' form-section--meal-active' : ''}`}>
          <div className="form-section__title"><UtensilsCrossed /><div><h2>Ăn/uống sau buổi chơi</h2></div></div>
          <label className="meal-toggle">
            <span><strong>Có ăn/uống sau buổi chơi</strong><small>Bật để chia đều hóa đơn cho người đi ăn/uống.</small></span>
            <input type="checkbox" {...register('hasMeal')} />
            <i aria-hidden="true" />
          </label>
          {hasMeal && (
            <div className="meal-fields">
              <NumberField label="Tổng hóa đơn ăn/uống" suffix="đ" error={errors.mealCost?.message} input={{ step: 1000, ...register('mealCost', { valueAsNumber: true }) }} />
              <div className="form-grid">
                <NumberField label="Số nữ" suffix="người" error={errors.mealFemaleCount?.message} input={{ 'aria-label': 'Số nữ đi ăn/uống', step: 1, ...register('mealFemaleCount', { valueAsNumber: true }) }} />
                <NumberField label="Số nam" suffix="người" error={errors.mealMaleCount?.message} input={{ 'aria-label': 'Số nam đi ăn/uống', step: 1, ...register('mealMaleCount', { valueAsNumber: true }) }} />
              </div>
              <p className="form-hint">Tiền ăn/uống được chia đều và làm tròn lên 1.000đ mỗi người.</p>
            </div>
          )}
        </section>

        {domainError && <div className="form-alert" role="alert">{domainError}</div>}
        <button className="button button--calculate button--wide" type="submit"><Calculator /> Tính tiền</button>
      </form>

      {calculation && (
        <div className="result-stage">
          <ResultPanel
            result={calculation}
            maleCount={getValues('maleCount')}
            femaleCount={getValues('femaleCount')}
            maleSurcharge={MALE_SURCHARGE}
          />
          <button className="button button--primary button--wide" type="button" onClick={save} disabled={saving}>
            <Save /> {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Lưu buổi chơi'}
          </button>
        </div>
      )}
    </div>
  )
}
