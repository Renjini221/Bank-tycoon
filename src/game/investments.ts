export const securities = {
  bill: { name: 'Treasury bill', term: 7, rate: 600 },
  note: { name: 'Municipal note', term: 30, rate: 825 },
  bond: { name: 'Infrastructure bond', term: 60, rate: 1050 },
} as const
export type Security = keyof typeof securities
export const minimumInvestment = 1_000_00
export type Investment = {
  id: number
  security: Security
  amount: number
  interest: number
  opened: number
  maturity: number
}
