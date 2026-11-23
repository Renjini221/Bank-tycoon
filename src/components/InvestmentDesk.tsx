import { useState } from 'react'
import { Banknote, Building2, Coins, Landmark, Layers3, Wallet } from 'lucide-react'
import { minimumInvestment, securities, type Security } from '../game/investments'
import { annualInterest, forecast, investedPrincipal, type Game } from '../game/model'
import { YEAR_DAYS } from '../game/config'
import { date, money, pct } from '../game/format'
import { Detail, Metric } from './BankPanels'

const icons = { bill: Banknote, note: Landmark, bond: Building2 }
export function InvestmentDesk({ game, review }: { game: Game; review: (security: Security) => void }) {
  const holdings = [...(game.investments ?? [])].sort((a,b) => a.maturity - b.maturity || a.id - b.id)
  const earned = game.ledger.reduce((sum,e) => e.kind === 'Investment interest' ? sum + e.amount : sum, 0)
  return <>
    <div className="summary-strip">
      <Metric icon={<Wallet/>} label="Available cash" value={money(game.cash)}/>
      <Metric icon={<Layers3/>} label="Invested principal" value={money(investedPrincipal(game))}/>
      <Metric icon={<Coins/>} label="Interest collected" value={money(earned,true)}/>
    </div>
    <section className="card"><div className="card-head"><h2>Available investments</h2></div>
      <p className="investment-intro">Choose how long to commit your cash. Each security pays a fixed return at maturity.</p>
      <div className="investment-offers">{(Object.keys(securities) as Security[]).map(key => {
        const issue = securities[key], Icon = icons[key]
        const beyondYear = game.day + issue.term > YEAR_DAYS
        return <article key={key}>
          <span className="title-icon"><Icon size={20}/></span><h3>{issue.name}</h3>
          <p className="investment-yield">{pct(issue.rate)} <small>per annum</small></p>
          <Detail label="Holding period">{issue.term} days</Detail>
          <Detail label="Minimum">{money(minimumInvestment)}</Detail>
          <button className="secondary" disabled={game.outcome !== 'open' || game.openReport !== null || beyondYear}
            aria-label={'Review '+issue.name.toLowerCase()} onClick={() => review(key)}>{beyondYear ? 'Matures after year-end' : 'Review investment'}</button>
        </article>
      })}</div>
    </section>
    <section className="card spaced"><div className="card-head"><div className="heading-count"><h2>Active holdings</h2><span className="count">{holdings.length}</span></div></div>
      {holdings.length ? <div className="table-scroll"><table><thead><tr><th>Security</th><th>Maturity</th><th>Principal</th><th>Interest at maturity</th></tr></thead>
        <tbody>{holdings.map(h => <tr key={h.id}><td>{securities[h.security].name}</td><td>{date(h.maturity)}</td><td>{money(h.amount)}</td><td>{money(h.interest,true)}</td></tr>)}</tbody>
      </table></div> : <div className="empty-state"><Layers3/><strong>No active investments</strong><p>Your first purchase will appear here with its payout date.</p></div>}
    </section>
  </>
}

export function InvestmentReview({game, security, buy}: {game: Game; security: Security; buy: (amount:number) => void}) {
  const [input,setInput] = useState(String(minimumInvestment / 100))
  const issue = securities[security]
  const amount = Number(input) * 100
  const valid = /^\d+$/.test(input) && Number.isSafeInteger(amount) && amount >= minimumInvestment
  const after = game.cash - amount
  const interest = annualInterest(amount,issue.rate,issue.term)
  return <form onSubmit={e => { e.preventDefault(); if (valid && after >= 0) buy(amount) }}>
    <p className="story">{issue.name} pays {pct(issue.rate)} per annum. Your cash is committed for {issue.term} days.</p>
    <label className="form-label" htmlFor="investment-amount">Amount to invest (₹)</label>
    <input id="investment-amount" className="investment-input" type="text" inputMode="numeric" value={input} onChange={e => setInput(e.target.value)}/>
    <div className="report-lines"><Detail label="Payout date">{date(game.day+issue.term)}</Detail>
      <Detail label="Interest earned at maturity">{valid ? money(interest,true) : '—'}</Detail>
      <Detail label="Total cash returned">{valid ? money(amount+interest,true) : '—'}</Detail>
      <Detail label="Cash left after purchase">{valid ? money(after,true) : '—'}</Detail></div>
    {!valid ? <p className="notice">Enter a whole-rupee amount of at least {money(minimumInvestment)}.</p> :
      after < 0 ? <p className="notice">This purchase exceeds the branch’s available cash.</p> :
      after < forecast(game).high && <p className="notice">Remaining cash falls below tomorrow’s upper withdrawal estimate.</p>}
    <button className="primary wide" disabled={!valid || after < 0}>Confirm investment</button>
  </form>
}
