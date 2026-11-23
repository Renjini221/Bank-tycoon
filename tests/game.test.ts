import test from 'node:test'
import assert from 'node:assert/strict'
import { BankClock, isSave } from '../src/game/clock'
import { DAY_MS, DIFFICULTY, EQUITY_TARGET, STARTING_CAPITAL } from '../src/game/config'
import { annualInterest, decideOffer, deposits, equity, forecast, monthReport, newGame, principal, receiveDeposit, savingsCost, setRate, settleDay } from '../src/game/model'

test('opening deposits and a further ₹10,000 leave equity unchanged', () => {
  const game = newGame(1)
  assert.equal(game.cash, 150000_00)
  assert.equal(game.offers.length, 3)
  receiveDeposit(game, 10000_00)
  assert.equal(game.cash, 160000_00)
  assert.equal(deposits(game), 60000_00)
  assert.equal(equity(game), STARTING_CAPITAL)
  assert.equal(monthReport(game,1).profit, 0)
})
test('loan approval and a principal instalment are asset transfers, only interest earns income', () => {
  let g = newGame(3)
  const id = g.offers[0].id
  g = decideOffer(g,id,true)
  assert.equal(g.cash,125000_00)
  assert.equal(principal(g),25000_00)
  assert.equal(equity(g),STARTING_CAPITAL)
  assert.equal(decideOffer(g,id,true),g)
  while (g.day <= 11) g = settleDay(g,g.day)
  const repayments = g.ledger.filter(e => e.kind === 'Principal')
  assert.equal(repayments.length,1)
  assert.equal(principal(g),25000_00 - repayments[0].amount)
  const r = monthReport(g,1)
  assert.equal(r.earned,annualInterest(25000_00,1800,10))
  assert.equal(r.profit,r.earned - r.savings - r.expenses)
  assert.equal(equity(g),STARTING_CAPITAL + r.profit)
})
test('elapsed clock obeys every speed, pause and restore preserve exact progress', () => {
  let now = 0
  const c = new BankClock(undefined,() => now)
  now = 10000; c.tick(); c.setSpeed(0)
  const frozen = c.get()
  now += 100000; c.tick()
  assert.deepEqual(c.get(),frozen)
  const restored = new BankClock(JSON.parse(JSON.stringify(c.save())),() => now)
  assert.equal(restored.get().speed,0)
  assert.equal(restored.get().elapsed,10000)
  restored.setSpeed(5); now += 10000; restored.tick()
  assert.equal(restored.get().game.day,2)
  assert.equal(restored.get().elapsed,0)
  restored.setSpeed(15); now += 4000; restored.tick()
  assert.equal(restored.get().game.day,3)
  now += 510; restored.next()
  assert.equal(restored.get().game.day,4)
  assert.equal(restored.get().elapsed,0)
  assert.equal(restored.get().speed,15)
  restored.setSpeed(0); restored.next()
  assert.equal(restored.get().game.day,5)
  assert.equal(restored.get().speed,0)
})
test('manual and automatic settlement in either event order cannot close a day twice', () => {
  for (const order of ['manual first','timer first','timer before click'] as const) {
    let time = 0
    const clock = new BankClock(undefined,() => time)
    time = DAY_MS - 1
    if (order === 'manual first') clock.next(1)
    time = DAY_MS + 1
    if (order === 'timer first') clock.tick()
    clock.next(order === 'timer first' ? clock.get().game.day : 1)
    clock.tick()
    assert.equal(clock.get().game.day,2,order)
    assert.equal(clock.get().game.history.length,1)
  }
})
test('Day 30 creates exactly one report and pauses before any subsequent settlement', () => {
  let time = 0
  const c = new BankClock(undefined,() => time)
  c.setSpeed(15); time = 31 * DAY_MS / 15; c.tick()
  assert.equal(c.get().game.reports.length,1)
  assert.equal(c.get().game.openReport,1)
  assert.equal(c.get().game.day,31)
  assert.equal(c.get().speed,0)
  const reloaded = new BankClock(JSON.parse(JSON.stringify(c.save())),() => time)
  reloaded.next(); reloaded.setSpeed(15); time += DAY_MS; reloaded.tick()
  assert.equal(reloaded.get().game.reports.length,1)
  assert.equal(reloaded.get().game.day,31)
  reloaded.decide(g => ({ ...g,openReport:null })); reloaded.next()
  assert.equal(reloaded.get().game.day,32)
})
test('reloading a settled repayment preserves it and rejects a stale day command', () => {
  let g = newGame(3)
  g = decideOffer(g,g.offers[0].id,true)
  while (g.day <= 11) g = settleDay(g,g.day)
  const saved = JSON.parse(JSON.stringify({ version:1,game:g,elapsed:2745 }))
  assert.ok(isSave(saved))
  const c = new BankClock(saved)
  const principalBefore = principal(g)
  c.next(11); c.next(12)
  assert.equal(c.get().game.ledger.filter(e => e.kind === 'Principal').length,1)
  assert.equal(principal(c.get().game),principalBefore)
  assert.deepEqual(c.get().game,settleDay(g,12))
})
test('higher savings rates increase deposits and interest cost, forecast includes scheduled withdrawals', () => {
  const g = newGame(31)
  const high = setRate(g,900)
  assert.ok(savingsCost(high,900) > savingsCost(g,400))
  assert.ok(deposits(settleDay(high,1)) > deposits(settleDay(g,1)))
  assert.ok(forecast(g,4).high > forecast(g,2).high)
  assert.ok(forecast(g).low >= forecast(g).known)
})
test('all opening decisions survive the first day across 100 seeds', () => {
  for (let seed = 0; seed < 100; seed++) {
    let g = newGame(seed)
    for (const offer of g.offers) g = decideOffer(g,offer.id,true)
    assert.equal(settleDay(g,1).outcome,'open')
  }
})
test('unpayable festival withdrawal ends the run with an exact cash shortfall', () => {
  const g = newGame(3)
  g.day = 4; g.settled = 3; g.cash = 0; g.accounts[0] += 500000_00
  const closed = settleDay(g,4)
  assert.equal(closed.outcome,'failed')
  const withdrawal = closed.ledger.at(-1)!
  assert.equal(closed.shortfall,withdrawal.amount - closed.cash)
  assert.ok(closed.shortfall > 0)
  assert.equal(settleDay(closed,4),closed)
})
test('a default writes off only remaining principal and leaves cash unchanged by the write-off', () => {
  let found = false
  for (let seed = 0; seed < 300 && !found; seed++) {
    let g = newGame(seed)
    g = decideOffer(g,g.offers[2].id,true)
    const l = g.loans[0]
    l.remaining = 17000_00; l.misses = DIFFICULTY.consecutiveMissesToDefault - 1; l.nextDue = g.day
    const result = settleDay(g,g.day)
    const loss = result.ledger.find(e => e.kind === 'Loan loss')
    if (loss) {
      assert.equal(loss.amount,17000_00); assert.equal(loss.cashDelta,0)
      assert.equal(principal(result),0); found = true
    }
  }
  assert.ok(found)
})
test('a full year reconciles earnings, assets and liabilities at every close', () => {
  let g = setRate(newGame(73),650)
  while (g.outcome === 'open') {
    if (g.openReport !== null) g = { ...g,openReport:null }
    for (const offer of g.offers) {
      if (g.cash - offer.amount >= forecast(g).high * 4) g = decideOffer(g,offer.id,true)
    }
    g = settleDay(g,g.day)
    assert.ok(Number.isSafeInteger(g.cash))
    assert.ok(g.accounts.every(n => Number.isSafeInteger(n) && n >= 0))
    assert.equal(g.cash,g.ledger.reduce((sum,e) => sum + e.cashDelta,0))
    const complete = g.reports.reduce((sum,r) => sum + r.profit,0)
    const partial = g.settled % 30 === 0 ? 0 : monthReport(g,Math.ceil(g.settled / 30)).profit
    assert.equal(equity(g),STARTING_CAPITAL + complete + partial)
  }
  assert.equal(g.outcome,'completed')
  assert.equal(g.reports.length,12)
  assert.equal(g.history.length,30)
  assert.ok(g.day === 360 && EQUITY_TARGET > STARTING_CAPITAL)
})
