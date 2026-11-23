import { YEAR_DAYS } from './config'
import { deposits, principal, type Game } from './model'

export type BankRank = { place: number; bank_name: string; equity_paise: number; is_you: boolean }

export function yearEndScore(game: Game): number | undefined {
  if (game.outcome !== 'completed' || game.day !== YEAR_DAYS || game.settled !== YEAR_DAYS) return undefined
  return game.cash + principal(game) - deposits(game)
}

export function deviceRanking(history: number[], current: number | undefined): BankRank[] {
  const scores = current === undefined ? history : [...history,current]
  const runs = scores.map((score, index) => ({
    equity_paise: score, bank_name: 'Run ' + (index + 1), is_you: index === history.length,
  }))
    .sort((a,b) => b.equity_paise - a.equity_paise)
  let place = 0
  return runs.map((run,index) => {
    if (index === 0 || runs[index - 1].equity_paise !== run.equity_paise) place = index + 1
    return { ...run, place }
  })
}
