import { useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, BookOpenText, ChevronRight, CircleCheck, Coins, Croissant, Fish, Flower2, HandCoins, Landmark, Megaphone, Percent, Scissors, Ship, SlidersHorizontal, Sprout, Store, Wallet, Waves, Wheat } from 'lucide-react'
import { deposits, equity, eventFor, forecast, monthReport, principal, savingsCost, type Application, type Game, type Report, type Trade } from '../game/model'
import { date, money, pct } from '../game/format'
import { Chart } from './Chart'

export type View = 'Overview' | 'Deposits Desk' | 'Loan Desk' | 'Investment Desk' | 'Ledger' | 'Reports' | 'Management' | 'Leaderboard'
export type Dialog = { type: 'loan'; id: string } | { type: 'investment'; security: import('../game/investments').Security } | { type: 'report'; month: number } | { type: 'rate'; product?: import('../game/model').InterestProduct } | { type: 'event' | 'account' | 'guide' | 'restart' }
export type Actions = { open: (d: Dialog) => void; navigate: (v: View) => void }
const tradeIcons = { bakery: Croissant, fishing: Fish, textiles: Scissors, farm: Wheat, shop: Store, transport: Ship }
export function TradeIcon({ trade }: { trade: Trade }) {
  const Icon = tradeIcons[trade]
  return <span className={'trade-icon ' + trade}><Icon size={23} strokeWidth={1.65}/></span>
}
export function RiskBadge({ risk }: { risk: Application['risk'] }) {
  return <span className={'risk ' + risk.toLowerCase()}><i/>{risk} risk</span>
}
export function Detail({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="detail"><span>{label}</span><strong>{children}</strong></div>
}
export function Treasury({ game }: { game: Game }) {
  return <section className="treasury">
    <div className="treasury-art"><span className="balance-label"><Wallet size={17}/>Available cash</span><div className="balance">{money(game.cash)}</div>
      <span className="reserve-state"><i/>{game.cash >= forecast(game).high ? 'Liquid reserves' : 'Low reserves'}</span>
    </div>
    <div className="treasury-metrics">{[['Bank equity', equity(game)], ['Loans outstanding', principal(game)], ['Customer deposits', deposits(game)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(Number(value))}</strong></div>)}</div>
  </section>
}
function Outlook({ game }: { game: Game }) {
  const f = forecast(game)
  return <section className="card outlook">
    <div className="card-head"><div className="title-with-icon"><span className="title-icon"><Waves size={19}/></span><h2>Liquidity outlook</h2></div></div>
    <p className="muted outlook-label">Estimated withdrawals tomorrow</p>
    <div className="outlook-range">{money(f.low)} <span>–</span> {money(f.high)}</div>
    <div className="outlook-lines"><Detail label={<><ArrowUpRight size={15}/>Scheduled withdrawals</>}>{money(f.known)}</Detail><Detail label={<><ArrowDownLeft size={15}/>Repayments due</>}>{money(f.repayments)}</Detail>{f.investmentPayout > 0 && <Detail label="Investments maturing">{money(f.investmentPayout,true)}</Detail>}</div>
  </section>
}
function Bulletin({ game, open }: { game: Game } & Pick<Actions,'open'>) {
  const event = eventFor(game.day)
  const left = event.start - game.day
  const missed = game.loans.filter(l => l.misses > 0)
  return <><button className="bulletin" onClick={() => open({ type: 'event' })}>
    <span className="event-icon">{event.type === 'festival' ? <Flower2 size={24}/> : <Megaphone size={22}/>}</span>
    <span className="event-body"><span className="event-title">{event.title}<span className="event-time">{left > 0 ? 'In ' + left + (left === 1 ? ' day' : ' days') : 'Underway'}</span></span><span className="event-text">{event.detail}</span></span><ChevronRight size={18}/>
  </button>{missed.length > 0 && <button className="notice" onClick={() => open({ type: 'event' })}>{missed[0].name} missed a repayment. Next collection on {date(missed[0].nextDue)}.</button>}</>
}
function OfferRow({ offer, day, open }: { offer: Application; day: number } & Pick<Actions,'open'>) {
  return <button className="offer-row" onClick={() => open({ type: 'loan', id: offer.id })}>
    <TradeIcon trade={offer.trade}/><span className="borrower"><strong>{offer.name}</strong><span>{offer.purpose}</span></span>
    <span className="offer-amount"><strong>{money(offer.amount)}</strong><small>{offer.term} days · {pct(offer.rate)} p.a.</small></span>
    <RiskBadge risk={offer.risk}/><ChevronRight size={17} className="chevron"/><span className="sr">Review application, expires in {offer.expires - day} days</span>
  </button>
}
function Applications({ game, open, navigate, full = false }: { game: Game; full?: boolean } & Actions) {
  const shown = full ? game.offers : game.offers.slice(0, 3)
  return <section className="card applications">
    <div className="card-head"><div className="heading-count"><h2>{full ? 'Pending applications' : 'Loan applications'}</h2><span className="count">{game.offers.length}</span></div>{!full && <button className="text-btn" onClick={() => navigate('Loan Desk')}>View all <ChevronRight size={15}/></button>}</div>
    {shown.length ? <div className="offer-list">{shown.map(o => <OfferRow key={o.id} offer={o} day={game.day} open={open}/>)}</div> : <div className="empty-state"><CircleCheck/><strong>All applications reviewed</strong><p>New borrowers arrive as the branch advances.</p></div>}
  </section>
}
function Savings({ game, open }: { game: Game } & Pick<Actions,'open'>) {
  return <section className="card savings"><span className="title-icon"><Percent size={18}/></span><div><h3>Savings rate</h3><span className="muted">{pct(game.savingsRate)} per annum</span></div><button className="secondary small" disabled={game.outcome !== 'open'} onClick={() => open({ type: 'rate' })}><SlidersHorizontal size={14}/>Adjust</button></section>
}
export function Overview({ game, ...actions }: { game: Game } & Actions) {
  return <>
    <div className="dashboard-grid top-grid"><Treasury game={game}/><Outlook game={game}/></div>
    <Bulletin game={game} open={actions.open}/>
    <div className="dashboard-grid"><Applications game={game} {...actions}/><Chart game={game}/></div>
    <div className="dashboard-grid lower-grid"><section className="card recent"><div className="card-head"><h2>Recent activity</h2><button className="text-btn" onClick={() => actions.navigate('Ledger')}>Open ledger <ChevronRight size={15}/></button></div>{game.ledger.slice(-3).reverse().map((e,i) => <div className="activity-row" key={i}><span className="mini-icon">{e.cashDelta >= 0 ? <ArrowDownLeft size={15}/> : <ArrowUpRight size={15}/>}</span><span><strong>{e.note}</strong><small>{e.kind} · {date(e.day)}</small></span><b>{e.cashDelta > 0 ? '+' : ''}{money(e.cashDelta, true)}</b></div>)}</section>
    <div className="side-stack"><Savings game={game} open={actions.open}/><section className="card year-goal"><div className="card-head"><h3>First-year goal</h3><Sprout size={20}/></div><p>Keep your branch open for 12 months.</p><div className="goal-track"><i style={{ width: (game.settled / 360 * 100) + '%' }}/></div><small>{game.settled} of 360 days completed</small></section></div></div>
  </>
}
export function LoanDesk({ game, ...actions }: { game: Game } & Actions) {
  return <><div className="summary-strip"><Metric icon={<Wallet/>} label="Cash available" value={money(game.cash)}/><Metric icon={<HandCoins/>} label="Loans outstanding" value={money(principal(game))}/><Metric icon={<Coins/>} label="Interest collected" value={money(game.ledger.reduce((n,e) => n + (e.kind === 'Loan interest' ? e.amount : 0), 0), true)}/></div>
    <Applications game={game} {...actions} full/>
    <section className="card spaced"><div className="card-head"><div className="heading-count"><h2>Active loans</h2><span className="count">{game.loans.length}</span></div></div>
    {game.loans.length ? game.loans.map(l => <div className="active-loan" key={l.id}><TradeIcon trade={l.trade}/><div><strong>{l.name}</strong><small>{l.purpose} · {pct(l.rate)} p.a.</small></div><div><strong>{money(l.remaining)}</strong><small>{l.misses ? 'Missed payment · retry' : 'Next payment'} · {date(l.nextDue)}</small></div><RiskBadge risk={l.risk}/></div>) : <div className="empty-state"><HandCoins/><strong>No active loans yet</strong><p>Approve an application to start collecting interest.</p></div>}</section>
  </>
}
export function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="card metric"><span className="title-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>
}
export function Ledger({ game }: { game: Game }) {
  const [filter, setFilter] = useState('All transactions')
  const [limit, setLimit] = useState(40)
  const rows = game.ledger.filter(e => filter === 'All transactions' || e.kind === filter).slice().reverse()
  return <section className="card"><div className="card-head"><h2>Transaction ledger</h2><select className="plain-select" aria-label="Filter transactions" value={filter} onChange={e => { setFilter(e.target.value); setLimit(40) }}><option>All transactions</option>{[...new Set(game.ledger.map(e => e.kind))].sort().map(k => <option key={k}>{k}</option>)}</select></div>
    <div className="table-scroll"><table><thead><tr><th>Date</th><th>Transaction</th><th>Type</th><th>Amount</th><th>Cash movement</th></tr></thead><tbody>{rows.slice(0,limit).map((e,i) => <tr key={i}><td>{date(e.day)}</td><td>{e.note}</td><td>{e.kind}</td><td>{e.amount ? money(e.amount,true) : '—'}</td><td className={e.cashDelta > 0 ? 'positive' : ''}>{e.cashDelta > 0 ? '+' : ''}{money(e.cashDelta,true)}</td></tr>)}</tbody></table></div>
    {rows.length > limit && <div className="load-more"><button className="secondary" onClick={() => setLimit(v => v + 40)}>Show more transactions</button></div>}</section>
}
export function ReportLines({ report }: { report: Report }) {
  return <div className="report-lines"><Detail label="Loan interest earned">{money(report.earned,true)}</Detail><Detail label="Investment interest earned">{money(report.investmentIncome ?? 0,true)}</Detail><Detail label="Savings interest credited">{money(-report.savings,true)}</Detail><Detail label="Operating expenses">{money(-report.expenses,true)}</Detail><Detail label="Loan losses">{money(-report.losses,true)}</Detail><div className="report-total"><Detail label="Net profit">{money(report.profit,true)}</Detail></div><Detail label="Closing cash">{money(report.closingCash,true)}</Detail><Detail label="Closing equity">{money(report.equity,true)}</Detail></div>
}
export function Reports({ game, open }: { game: Game } & Pick<Actions,'open'>) {
  const live = monthReport(game, Math.ceil(game.day / 30))
  return <><div className="summary-strip"><Metric icon={<Banknote/>} label="Current month’s profit" value={money(live.profit,true)}/><Metric icon={<Percent/>} label="Daily savings cost" value={money(savingsCost(game,game.savingsRate),true)}/><Metric icon={<Landmark/>} label="Bank equity" value={money(equity(game),true)}/></div>
    <div className="dashboard-grid"><section className="card"><div className="card-head"><h2>Monthly statements</h2></div>{game.reports.length ? game.reports.slice().reverse().map(r => <button className="report-row" key={r.month} onClick={() => open({ type: 'report', month: r.month })}><BookOpenText size={20}/><strong>Month {r.month}</strong><span>Net {money(r.profit,true)}</span><ChevronRight size={16}/></button>) : <div className="empty-state"><BookOpenText/><strong>Your first statement closes on Day 30</strong><p>Each statement records profit, losses and cash at month-end.</p></div>}</section><Chart game={game}/></div></>
}
