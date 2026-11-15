import {
  MALE_SURCHARGE,
  ROUNDING_UNIT,
  SessionValidationError,
  type MealCalculation,
  type SessionCalculation,
  type SessionInput,
} from './session'

type IntegerField =
  | 'courtCost'
  | 'shuttleCount'
  | 'shuttleUnitPrice'
  | 'maleCount'
  | 'femaleCount'
  | 'mealCost'
  | 'mealMaleCount'
  | 'mealFemaleCount'

const ensureNonNegativeInteger = (
  value: number,
  field: IntegerField,
  label: string,
) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new SessionValidationError(`${label} phải là số nguyên không âm.`, field)
  }
}

const ensureSafeCalculation = (values: number[]) => {
  if (values.some((value) => !Number.isSafeInteger(value))) {
    throw new SessionValidationError('Chi phí vượt quá giới hạn tính toán.', 'courtCost')
  }
}

const calculateMeal = (
  input: SessionInput,
  femaleFee: number,
  maleFee: number,
): MealCalculation | null => {
  if (!input.meal) return null

  const meal = input.meal
  ensureNonNegativeInteger(meal.cost, 'mealCost', 'Tổng hóa đơn ăn/uống')
  ensureNonNegativeInteger(meal.femaleCount, 'mealFemaleCount', 'Số nữ đi ăn/uống')
  ensureNonNegativeInteger(meal.maleCount, 'mealMaleCount', 'Số nam đi ăn/uống')

  if (meal.cost === 0) {
    throw new SessionValidationError('Tổng hóa đơn ăn/uống phải lớn hơn 0đ.', 'mealCost')
  }
  if (meal.femaleCount > input.femaleCount) {
    throw new SessionValidationError('Số nữ đi ăn/uống không được vượt số nữ chơi.', 'mealFemaleCount')
  }
  if (meal.maleCount > input.maleCount) {
    throw new SessionValidationError('Số nam đi ăn/uống không được vượt số nam chơi.', 'mealMaleCount')
  }

  const peopleCount = meal.femaleCount + meal.maleCount
  if (peopleCount === 0) {
    throw new SessionValidationError('Cần có ít nhất một người đi ăn/uống.', 'mealParticipants')
  }

  const perPersonFee = Math.ceil(meal.cost / (peopleCount * ROUNDING_UNIT)) * ROUNDING_UNIT
  const femaleWithMealFee = femaleFee + perPersonFee
  const maleWithMealFee = maleFee + perPersonFee
  const totalCollected = peopleCount * perPersonFee
  const surplus = totalCollected - meal.cost

  ensureSafeCalculation([
    peopleCount,
    perPersonFee,
    femaleWithMealFee,
    maleWithMealFee,
    totalCollected,
    surplus,
  ])

  return {
    ...meal,
    peopleCount,
    perPersonFee,
    femaleWithMealFee,
    maleWithMealFee,
    totalCollected,
    surplus,
  }
}

export const calculateSession = (input: SessionInput): SessionCalculation => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.playDate)) {
    throw new SessionValidationError('Ngày chơi không hợp lệ.', 'playDate')
  }

  ensureNonNegativeInteger(input.courtCost, 'courtCost', 'Tiền sân')
  ensureNonNegativeInteger(input.shuttleCount, 'shuttleCount', 'Số cầu')
  ensureNonNegativeInteger(input.shuttleUnitPrice, 'shuttleUnitPrice', 'Giá cầu')
  ensureNonNegativeInteger(input.maleCount, 'maleCount', 'Số nam')
  ensureNonNegativeInteger(input.femaleCount, 'femaleCount', 'Số nữ')

  const totalPeople = input.maleCount + input.femaleCount
  if (totalPeople === 0) {
    throw new SessionValidationError('Cần có ít nhất một người chơi.', 'participants')
  }

  const shuttleCost = input.shuttleCount * input.shuttleUnitPrice
  const playTotalCost = input.courtCost + shuttleCost

  ensureSafeCalculation([shuttleCost, playTotalCost])

  const hasMixedGenders = input.maleCount > 0 && input.femaleCount > 0
  let femaleFee: number
  let maleFee: number
  let playTotalCollected: number

  if (!hasMixedGenders) {
    const sharedFee = Math.ceil(playTotalCost / (totalPeople * ROUNDING_UNIT)) * ROUNDING_UNIT
    femaleFee = sharedFee
    maleFee = sharedFee
    playTotalCollected = totalPeople * sharedFee
  } else {
    const baseCost = playTotalCost - input.maleCount * MALE_SURCHARGE

    if (baseCost < 0) {
      throw new SessionValidationError(
        'Tổng chi phí phải lớn hơn hoặc bằng tổng phụ thu của nam.',
        'baseCost',
      )
    }

    femaleFee = Math.ceil(baseCost / (totalPeople * ROUNDING_UNIT)) * ROUNDING_UNIT
    maleFee = femaleFee + MALE_SURCHARGE
    playTotalCollected = input.femaleCount * femaleFee + input.maleCount * maleFee
  }

  ensureSafeCalculation([femaleFee, maleFee, playTotalCollected])

  const meal = calculateMeal(input, femaleFee, maleFee)
  const totalCost = playTotalCost + (meal?.cost ?? 0)
  const totalCollected = playTotalCollected + (meal?.totalCollected ?? 0)
  const surplus = totalCollected - totalCost

  ensureSafeCalculation([totalCost, totalCollected, surplus])

  return {
    shuttleCost,
    totalCost,
    femaleFee,
    maleFee,
    totalCollected,
    surplus,
    meal,
  }
}
