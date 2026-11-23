import test from 'node:test'
import assert from 'node:assert/strict'
import { acceptDeposit, annualInterest, daysUntilOffer, depositCustomer, deposits, equity, forecast, manageStaff, newGame, setRate, settleDay } from '../src/game/model'
import { isSave } from '../src/game/clock'

test('all four deposits preserve opening equity and term balances pay out at maturity',()=>{
  let g=newGame(12)
  const recurringCustomer = depositCustomer(g,'Recurring')
  const opening=equity(g)
  for(const product of ['Savings','Current','Fixed','Recurring'] as const){
    g=acceptDeposit(g,product)
    assert.equal(acceptDeposit(g,product),g)
  }
  assert.equal(equity(g),opening)
  assert.equal(deposits(g),89000_00)
  while(g.day<31) g=settleDay(g,g.day)
  assert.equal(g.ledger.filter(e=>e.note==='Recurring instalment · '+recurringCustomer).length,2)
  assert.ok(forecast(g,31).maturity>26000_00)
  g=settleDay({...g,openReport:null},31)
  assert.equal(g.contracts?.length,0)
  assert.equal(g.outcome,'open')
})

test('desk customers rotate on acceptance and keep their names across reloads',()=>{
  let g=newGame(12)
  const products=['Savings','Current','Fixed','Recurring'] as const
  const seen = new Set<string>()
  for(let round=0;round<15;round++){
    while(daysUntilOffer(g,'Savings')>0) {
      if(g.openReport !== null) g={...g,openReport:null}
      g=settleDay(g,g.day)
      assert.equal(g.outcome,'open')
    }
    const offers=products.map(p=>depositCustomer(g,p))
    assert.equal(new Set(offers).size,4)
    for(const [i,product] of products.entries()){
      const customer=depositCustomer(g,product)
      assert.equal(customer,offers[i])
      assert.ok(!seen.has(customer))
      seen.add(customer)
      g=acceptDeposit(g,product)
      assert.equal(g.ledger.at(-1)?.note,product+' account opened · '+customer)
      const next=depositCustomer(g,product)
      g=JSON.parse(JSON.stringify(g))
      assert.equal(depositCustomer(g,product),next)
      if(product==='Fixed' || product==='Recurring') assert.equal(g.contracts?.at(-1)?.customer,customer)
    }
  }
  assert.equal(seen.size,60)
  for(const name of ['Nandu','Sama','Haari','Hasjan','Devanandan']) assert.ok(seen.has(name))
})

test('older saves get new offer names while existing contract owners keep their names',()=>{
  const g=newGame(9)
  delete g.customerQueue
  g.contracts=[{ product:'Fixed',balance:20000_00,opened:1,maturity:31,customer:'Haari' }]
  const customer=depositCustomer(g,'Savings')
  const next=acceptDeposit(g,'Savings')
  assert.equal(next.ledger.at(-1)?.note,'Savings account opened · '+customer)
  assert.equal(next.contracts?.[0].customer,'Haari')
  assert.notEqual(depositCustomer(next,'Savings'),customer)
})

test('higher savings rates open more customer accounts and fractional demand survives a reload',()=>{
  function play(rate:number) {
    let g=setRate(newGame(31),rate)
    for(let i=0;i<10;i++) {
      const previousCount=g.accounts.length
      g=settleDay(g,g.day)
      assert.equal(g.accounts.length-previousCount,g.lastWalkIns)
      const restored=JSON.parse(JSON.stringify({version:1,elapsed:0,game:g}))
      assert.ok(isSave(restored))
      g=restored.game
    }
    return g
  }
  const low=play(100), high=play(900)
  assert.equal(low.accounts.length-6,5)
  assert.equal(high.accounts.length-6,45)
  assert.ok(deposits(high)>deposits(low))
})

test('rate changes attract term depositors sooner and preserve contracted rates for existing and legacy deposits',()=>{
  for (const product of ['Fixed','Recurring'] as const) {
    let base=acceptDeposit(newGame(17),product)
    const old=base.contracts![0]
    const oldRate=old.rate!
    delete old.rate // Legacy save from before rates were configurable.
    base=settleDay(base,1)
    let high=setRate(base,900,product)
    const low=setRate(base,100,product)
    assert.ok(daysUntilOffer(high,product)<daysUntilOffer(low,product))
    const next=high.day+daysUntilOffer(high,product)
    while(high.day<next) {
      assert.equal(acceptDeposit(high,product),high)
      high=settleDay(high,high.day)
    }
    high=acceptDeposit(high,product)
    const [first,second]=high.contracts!
    assert.equal(second.rate,900)
    const settled=settleDay(setRate(high,100,product),high.day)
    assert.equal(settled.contracts![0].balance-first.balance,annualInterest(first.balance,oldRate))
    assert.equal(settled.contracts![1].balance-second.balance,annualInterest(second.balance,900))
  }
})
test('training increases deposits, payroll posts once, and firing stops payroll',()=>{
  const initial=newGame(4)
  let g=manageStaff(initial,'Asha Nair','Hire')
  g=manageStaff(g,'Asha Nair','Train')
  assert.equal(initial.cash-g.cash,1250_00)
  const reference=settleDay(initial,1)
  g=settleDay(g,1)
  assert.equal(g.ledger.filter(e=>e.kind==='Deposit').at(-1)!.amount-reference.ledger.filter(e=>e.kind==='Deposit').at(-1)!.amount,500_00)
  g=settleDay(manageStaff(g,'Asha Nair','Fire'),2)
  assert.equal(g.ledger.filter(e=>e.note==='Staff payroll').length,1)
})
