import { DAY_MS, SPEEDS } from './config'
import { newGame, settleDay, type Game } from './model'
import { securities } from './investments'

export type Speed = 0 | (typeof SPEEDS)[number]
export type Save = { version: 1; game: Game; elapsed: number }
export type Snapshot = { game: Game; elapsed: number; speed: Speed }
type Listener = () => void
export function isSave(value: unknown): value is Save {
  if (!value || typeof value !== 'object') return false
  const s = value as Save
  const g = s.game
  return s.version === 1 && Number.isFinite(s.elapsed) && s.elapsed >= 0 && s.elapsed < DAY_MS &&
    !!g && g.version === 1 && Number.isInteger(g.day) && g.day >= 1 && g.day <= 360 &&
    Number.isInteger(g.settled) && Number.isSafeInteger(g.cash) && Number.isInteger(g.seed) &&
    Number.isInteger(g.savingsRate) && ['open', 'completed', 'failed'].includes(g.outcome) &&
    Array.isArray(g.accounts) && g.accounts.length >= 6 && g.accounts.every(n => Number.isSafeInteger(n) && n >= 0) &&
    Array.isArray(g.offers) && Array.isArray(g.loans) && Array.isArray(g.history) &&
    (g.investments === undefined || (Array.isArray(g.investments) && g.investments.every(h =>
      h && Object.hasOwn(securities, h.security) && Number.isSafeInteger(h.id) &&
      Number.isSafeInteger(h.amount) && h.amount > 0 && Number.isSafeInteger(h.interest) && h.interest >= 0 &&
      Number.isInteger(h.opened) && Number.isInteger(h.maturity) && h.maturity > h.opened))) &&
    Array.isArray(g.reports) && Array.isArray(g.ledger)
}
export class BankClock {
  private state: Snapshot
  private lastTime: number
  private lastAutomatic = -Infinity
  private listeners = new Set<Listener>()
  private saveListeners = new Set<Listener>()
  private now: () => number
  constructor(save?: Save, now = () => performance.now()) {
    this.now = now
    this.state = { game: save?.game ?? newGame(), elapsed: save?.elapsed ?? 0, speed: save ? 0 : 1 }
    this.lastTime = now()
  }
  get = () => this.state
  save = (): Save => ({ version: 1, game: this.state.game, elapsed: this.state.elapsed })
  subscribe = (fn: Listener) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  onSave = (fn: Listener) => { this.saveListeners.add(fn); return () => { this.saveListeners.delete(fn) } }
  private emit(durable: boolean) {
    for (const fn of this.listeners) fn()
    if (durable) for (const fn of this.saveListeners) fn()
  }
  tick = () => {
    const time = this.now()
    let { game, speed, elapsed } = this.state
    const delta = Math.max(0, time - this.lastTime)
    this.lastTime = time
    if (!speed || !delta) return
    elapsed += delta * speed
    let settled = false
    while (elapsed >= DAY_MS) {
      game = settleDay(game, game.day)
      elapsed -= DAY_MS
      this.lastAutomatic = time
      settled = true
      if (game.openReport !== null || game.outcome !== 'open') { speed = 0; elapsed = 0; break }
    }
    this.state = { game, speed, elapsed }
    this.emit(settled)
  }
  setSpeed = (speed: Speed) => {
    this.tick()
    if (speed && (this.state.game.openReport !== null || this.state.game.outcome !== 'open')) return
    this.state = { ...this.state, speed }
    this.emit(true)
  }
  next = (expectedDay = this.state.game.day) => {
    this.tick()
    if (this.state.game.day !== expectedDay || this.now() - this.lastAutomatic < 250) return
    const game = settleDay(this.state.game, expectedDay)
    if (game === this.state.game) return
    this.state = { game, elapsed: 0, speed: game.outcome === 'open' && game.openReport === null ? this.state.speed : 0 }
    this.emit(true)
  }
  decide = (change: (g: Game) => Game) => {
    this.tick()
    const game = change(this.state.game)
    if (game === this.state.game) return
    this.state = { ...this.state, game }
    this.emit(true)
  }
  restore = (save: Save) => {
    this.state = { game: save.game, elapsed: save.elapsed, speed: 0 }
    this.lastTime = this.now()
    this.lastAutomatic = -Infinity
    this.emit(true)
  }
}
