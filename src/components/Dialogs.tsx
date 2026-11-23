import { useState } from 'react'
import { PlayerForm } from './PlayerForm'
import { AlertCircle, Check, Cloud, Flower2, Landmark, ShieldCheck, Wallet } from 'lucide-react'
import { annualInterest, dailySavers, equity, eventFor, forecast, offerInterval, openingAmount, productRate, savingsCost, type Application, type Game, type InterestProduct } from '../game/model'
import { EQUITY_TARGET } from '../game/config'
import { date, money, pct } from '../game/format'
import { Detail, RiskBadge, TradeIcon } from './BankPanels'
import type { Account } from '../store'

export function LoanReview({ game, offer, decide }: { game: Game; offer: Application; decide: (approve: boolean) => void }) {
  const after = game.cash - offer.amount
  return <><div className="review-person"><TradeIcon trade={offer.trade}/><div><h3>{offer.name}</h3><p>{offer.purpose}</p></div><RiskBadge risk={offer.risk}/></div>
    <p className="story">{offer.story}</p>
    <div className="review-amount"><span>Requested loan</span><strong>{money(offer.amount)}</strong></div>
    <div className="review-grid"><div><small>Annual interest</small><b>{pct(offer.rate)}</b></div><div><small>Loan term</small><b>{offer.term} days</b></div><div><small>Repayment schedule</small><b>Every {offer.interval} days</b></div><div><small>Application expires</small><b>{date(offer.expires)}</b></div></div>
    <p className="fineprint">{offer.term / offer.interval} principal instalments plus interest on the remaining balance. First payment due {date(game.day + offer.interval)}. First instalment totals {money(Math.ceil(offer.amount * offer.interval / offer.term) + annualInterest(offer.amount,offer.rate,offer.interval),true)}.</p>
    <div className={'decision-result ' + (after < forecast(game).high ? 'warning' : '')}><Wallet size={17}/><span>Cash after approval</span><strong>{money(after,true)}</strong></div>
    {after < forecast(game).high && <p className="fineprint">{after < 0 ? 'This loan exceeds the cash available.' : 'The remaining cash falls below tomorrow’s upper withdrawal estimate.'}</p>}
    <div className="modal-actions"><button className="secondary" onClick={() => decide(false)}>Decline</button><button className="primary" disabled={after < 0} onClick={() => decide(true)}><Check size={16}/>Approve loan</button></div>
  </>
}
export function RateForm({ game, product, submit }: { game: Game; product: InterestProduct; submit: (rate: number) => void }) {
  const current = productRate(game,product)
  const [rate,setRate] = useState(current)
  const savings = product === 'Savings'
  const dailyCost = (r: number) => savings ? savingsCost(game,r) : annualInterest(openingAmount[product],r)
  return <><p className="story">{savings ? 'Higher rates bring more new savers to the branch each day. Your new rate applies to every savings balance.' : 'Higher rates bring the next customer offer sooner. Existing contracts keep the rate agreed at opening.'}</p>
    <label className="rate-label" htmlFor="rate">Annual {product.toLowerCase()} rate <strong>{pct(rate)}</strong></label><input id="rate" type="range" min="100" max="900" step="25" value={rate} onChange={e => setRate(+e.target.value)}/><div className="range-labels"><span>1%</span><span>9%</span></div>
    <div className="report-lines">{savings ? <Detail label="New savers per day, on average">{dailySavers(current)} → {dailySavers(rate)}</Detail> : <Detail label="Days between customer offers">{offerInterval(product,current)} → {offerInterval(product,rate)}</Detail>}
      <Detail label={savings ? 'Daily interest on existing savings' : 'Daily interest on a new '+money(openingAmount[product])+' deposit'}>{money(dailyCost(current),true)} → {money(dailyCost(rate),true)}</Detail></div>
    <button className="primary wide" onClick={() => submit(rate)}>Confirm {product.toLowerCase()} rate</button></>
}
export function EventDetails({ game }: { game: Game }) {
  const e = eventFor(game.day)
  return <><div className="event-feature"><Flower2/><div><h3>{e.title}</h3><p>Day {e.start}–{e.end} · Year 1</p></div></div><p className="story">{e.detail} {e.type === 'festival' ? 'Keep enough cash on hand before approving another loan. Festival withdrawals continue for three days.' : 'Merchants place larger deposits and submit fresh loan applications during the boom.'}</p>
    <Detail label="Cash available">{money(game.cash)}</Detail><Detail label="Tomorrow’s upper estimate">{money(forecast(game).high)}</Detail>
    {game.loans.filter(l => l.misses > 0).map(l => <p className="notice" key={l.id}>{l.name} missed a payment. Collection resumes on {date(l.nextDue)}. A second consecutive missed payment writes off {money(l.remaining)} of principal.</p>)}</>
}
export function Guide() {
  return <><p className="story">Run the Kochi branch for 360 days. You start with ₹1,00,000 of your own money and three local savers.</p>
    <div className="guide-items"><div><Wallet/><section><h3>Keep cash for withdrawals</h3><p>Use the liquidity outlook before lending. Scheduled withdrawals are included in the forecast range. An unpaid withdrawal ends the run.</p></section></div>
    <div><Landmark/><section><h3>Earn interest on loans</h3><p>Review the borrower, repayment schedule and cash left after approval. Principal comes back as cash. Interest is income.</p></section></div>
    <div><ShieldCheck/><section><h3>Grow your equity</h3><p>Equity equals cash, outstanding loan principal and invested principal, less deposits owed. Reach {money(EQUITY_TARGET)} by year-end for the stretch goal.</p></section></div></div>
    <p className="fineprint">At 1×, a day takes 60 seconds. Each month lasts 30 days. Next day settles immediately. Reviews pause the clock while open. Returning to a saved game leaves the clock paused.</p></>
}
export function AccountPanel({ account, local, restart }: { account: Account; local: string; restart: () => void }) {
  const [message,setMessage] = useState('')
  return <><div className="account-status"><ShieldCheck size={22}/><div><strong>{account.user?.user_metadata?.username ?? account.user?.email ?? 'Guest player'}</strong><small>{local}</small></div></div>
    <h3 className="section-sub"><Cloud size={17}/>Cloud saves</h3>
    {account.user ? <><p className="story">{account.sync?.status === 'error' ? 'Cloud sync failed. ' + account.sync.error : account.sync?.status === 'synced' ? 'Your cloud save is up to date.' : 'Connecting your branch to the cloud…'}</p>{account.sync?.status === 'error' && <button className="secondary" onClick={account.retry}>Retry sync</button>}<button className="secondary" onClick={() => { void account.signOut().catch(e => setMessage(String(e))) }}>Sign out</button></> :
    <PlayerForm account={account}/>}
    {message && <p className="notice" role="status">{message}</p>}
    <div className="account-reset"><div><strong>Start a new bank</strong><small>Replace this run with a fresh Day 1.</small></div><button className="secondary small" onClick={restart}>New run</button></div></>
}
export function Conflict({ account, game }: { account: Account; game: Game }) {
  const remote = account.sync?.remote?.state.game
  if (!remote) return null
  return <><p className="story"><AlertCircle size={16}/> Your device and cloud have different saves. Choose the branch to keep on both.</p>{(['local','cloud'] as const).map(source => {
    const g = source === 'local' ? game : remote
    return <button className="save-choice" key={source} onClick={() => void account.choose(source)}><strong>Keep {source === 'local' ? 'device' : 'cloud'} save</strong><span>{date(g.day)} · Equity {money(equity(g),true)} · {g.ledger.length} entries</span></button>
  })}</>
}
