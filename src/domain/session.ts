export const MALE_SURCHARGE = 15_000
export const ROUNDING_UNIT = 1_000
export const CALCULATION_RULE_VERSION = 3

export type ShuttleSource = 'inventory' | 'external'

export type MealInput = {
  cost: number
  maleCount: number
  femaleCount: number
}

export type MealCalculation = MealInput & {
  peopleCount: number
  perPersonFee: number
  femaleWithMealFee: number
  maleWithMealFee: number
  totalCollected: number
  surplus: number
}

export type SessionInput = {
  playDate: string
  startTime: string
  endTime: string
  note: string
  courtCost: number
  shuttleCount: number
  shuttleUnitPrice: number
  shuttleSource: ShuttleSource
  maleCount: number
  femaleCount: number
  meal: MealInput | null
}

export type SessionCalculation = {
  shuttleCost: number
  totalCost: number
  femaleFee: number
  maleFee: number
  totalCollected: number
  surplus: number
  meal: MealCalculation | null
}

export type BadmintonSession = Omit<SessionInput, 'meal'> &
  SessionCalculation & {
    id: string
    ownerId: string
    paymentQrId: string | null
    ruleVersion: number
    maleSurcharge: number
    roundingUnit: number
    createdAt: string
    updatedAt: string
  }

export type CalculationField =
  | 'playDate'
  | 'courtCost'
  | 'shuttleCount'
  | 'shuttleUnitPrice'
  | 'maleCount'
  | 'femaleCount'
  | 'mealCost'
  | 'mealMaleCount'
  | 'mealFemaleCount'
  | 'mealParticipants'
  | 'participants'
  | 'baseCost'

export class SessionValidationError extends Error {
  readonly field: CalculationField

  constructor(message: string, field: CalculationField) {
    super(message)
    this.name = 'SessionValidationError'
    this.field = field
  }
}
