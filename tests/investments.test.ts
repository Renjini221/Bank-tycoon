import test from 'node:test'
import assert from 'node:assert/strict'
import { isSave } from '../src/game/clock'
import { annualInterest, equity, forecast, invest, investedPrincipal, monthReport, newGame, settleDay } from '../src/game/model'

test('purchase exchanges cash for an asset and rejects a replay, invalid amount or blocked run', () => {
  const bank = newGame(27)
  const id = bank.ledger.length
  const bought = invest(bank,'bill',10_000_00,id)
  assert.equal(bought.cash,bank.cash-10_000_00)
  assert.equal(investedPrincipal(bought),10_000_00)
  assert.equal(equity(bought),equity(bank))
  assert.equal(monthReport(bought,1).profit,0)
  assert.equal(invest(bought,'bill',10_000_00,id),bought)
  for (const amount of [0,900_00,1000_01,NaN,bank.cash+100]) assert.equal(invest(bank,'bill',amount,id),bank)
  for (const state of [{...bank,day:355},{...bank,openReport:1},{...bank,outcome:'failed' as const}]) {
    assert.equal(invest(state,'bill',1000_00,id),state)
  }
})

test('maturity forecasts, credits and reports reconcile across month close and reload', () => {
  let bank = newGame(12)
  while(bank.day<23) bank=settleDay(bank,bank.day)
  bank=invest(bank,'bill',12_000_00,bank.ledger.length)
  bank=invest(bank,'bill',3_000_00,bank.ledger.length)
  const interest=annualInterest(12_000_00,600,7)+annualInterest(3_000_00,600,7)
  while(bank.day<29) bank=settleDay(bank,bank.day)
  assert.equal(forecast(bank).investmentPayout,15_000_00+interest)
  bank=settleDay(bank,29)
  const save=JSON.parse(JSON.stringify({version:1,elapsed:0,game:bank}))
  assert.ok(isSave(save))
  bank=settleDay(save.game,30)
  assert.equal(investedPrincipal(bank),0)
  assert.equal(bank.ledger.filter(e=>e.kind==='Investment redemption').reduce((n,e)=>n+e.cashDelta,0),15_000_00)
  const report=bank.reports[0]
  assert.equal(report.investmentIncome,interest)
  assert.equal(report.profit,report.earned+interest-report.savings-report.expenses-report.losses)
  assert.equal(equity(bank),equity(newGame(12))+report.profit)
  assert.equal(bank.cash,bank.ledger.reduce((n,e)=>n+e.cashDelta,0))
  assert.equal(settleDay(bank,30),bank)
})
