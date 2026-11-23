import test from 'node:test'
import assert from 'node:assert/strict'
import { yearEndScore, deviceRanking } from '../src/game/leaderboard'
import { BankClock } from '../src/game/clock'
import { DAY_MS, STARTING_CAPITAL } from '../src/game/config'
import { decideOffer, newGame, receiveDeposit, settleDay, type Game } from '../src/game/model'

test('Day 360 equity reconciles all deposit types and uses remaining loan principal', () => {
  const g = newGame(7)
  const final: Game = { ...g, day:360, settled:360, outcome:'completed', cash:80_000_00,
    loans:[{...g.offers[0], amount:200_000_00, remaining:170_000_00, nextDue:370,lastPaid:350,misses:0}],
    accounts:[40_000_00,0,0,0,0,0], currentBalance:35_000_00,
    contracts:[{product:'Fixed',balance:30_000_00,opened:350,maturity:380},{product:'Recurring',balance:15_000_00,opened:350,maturity:380}] }
  assert.equal(yearEndScore(final),130_000_00)
  assert.equal(yearEndScore(final)!-STARTING_CAPITAL,30_000_00)
  receiveDeposit(final,10_000_00)
  assert.equal(yearEndScore(final),130_000_00)
  assert.equal(yearEndScore({...final,settled:359}),undefined)
  assert.equal(yearEndScore({...final,outcome:'failed'}),undefined)
  assert.equal(yearEndScore({...final,outcome:'open'}),undefined)
})

test('rank completed years in integer paise, retaining ties, zero and negative equity', () => {
  const history = [500,-2,500,501]
  const rows = deviceRanking(history,0)
  assert.deepEqual(rows.map(r=>r.place),[1,2,2,4,5])
  assert.deepEqual(rows.map(r=>r.equity_paise),[501,500,500,0,-2])
  assert.equal(rows[3].is_you,true)
  assert.deepEqual(deviceRanking([],undefined),[])
  assert.equal(deviceRanking(history,undefined).length,4)
})

test('the same bank and decisions earn the same year-end score at 1× and 15×', () => {
  function finish(speed: 1 | 15) {
    let time=0
    const g=newGame(83)
    const c=new BankClock({version:1,game:decideOffer(g,g.offers[0].id,true),elapsed:0},()=>time)
    for(let month=1;month<=12;month++) {
      c.setSpeed(speed)
      time+=30*DAY_MS/speed
      c.tick()
      assert.equal(c.get().game.openReport,month)
      if(month<12) assert.equal(yearEndScore(c.get().game),undefined)
      c.decide(game=>({...game,openReport:null}))
    }
    return yearEndScore(c.get().game)
  }
  const score=finish(1)
  assert.ok(Number.isSafeInteger(score))
  assert.equal(finish(15),score)
})

test('a last-day default is settled before the leaderboard can score the bank', () => {
  for(let seed=0;seed<200;seed++) {
    let g=newGame(seed)
    g=decideOffer(g,g.offers[2].id,true)
    g.day=360; g.settled=359
    const loan=g.loans[0]
    loan.remaining=7_000_00; loan.nextDue=360; loan.misses=1
    const closed=settleDay(g,360)
    if(!closed.ledger.some(e=>e.kind==='Loan loss')) continue
    assert.equal(closed.loans.length,0)
    assert.equal(yearEndScore(closed),closed.cash-closed.accounts.reduce((sum,n)=>sum+n,0))
    return
  }
  assert.fail('Expected a final-day default among the seeded runs')
})
