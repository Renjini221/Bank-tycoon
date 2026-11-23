// Monetary constants are in paise. Annual rates are in basis points (100 = 1%).
export const DAY_MS = 60_000
export const SPEEDS = [1, 5, 15] as const
export const STARTING_CAPITAL = 100_000_00
export const EQUITY_TARGET = 200_000_00
export const YEAR_DAYS = 360
export const DIFFICULTY = {
  dailyExpense: 65_00,
  dailyDepositGrowth: 52_00,
  minimumWithdrawal: 1_800_00,
  withdrawalShare: 0.009,
  missChance: { Low: 0.012, Medium: 0.047, High: 0.105 },
  consecutiveMissesToDefault: 2,
}
