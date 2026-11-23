import { CalendarDays, Inbox, Wallet } from 'lucide-react'
import { money, pct } from '../game/format'
import {
  acceptDeposit, dailySavers, daysUntilOffer, depositCustomer, deposits, openingAmount, productRate,
  type Game, type InterestProduct, type Product,
} from '../game/model'
import { clock } from '../store'
import { Metric } from './BankPanels'

const products: Product[] = ['Savings', 'Current', 'Fixed', 'Recurring']

export function DepositsDesk({ game, openRate }: { game: Game; openRate: (product: InterestProduct) => void }) {
  const closed = game.outcome !== 'open' || game.openReport !== null
  const descriptions = {
    Savings: pct(game.savingsRate) + ' annual interest. Withdrawable on demand.',
    Current: 'No interest. Available for business withdrawals on demand.',
    Fixed: pct(productRate(game, 'Fixed')) + ' annual interest on new deposits. Pay out after 30 days.',
    Recurring: pct(productRate(game, 'Recurring')) + ' annual interest on new deposits. Collect ₹2,000 now and on days 10 and 20. Pay out after 30 days.',
  }
  const contracts = game.contracts ?? []
  const ready = closed ? 0 : products.filter(product => daysUntilOffer(game, product) === 0).length
  return <>
    <div className="summary-strip">
      <Metric icon={<Wallet/>} label="Customer deposits" value={money(deposits(game), true)}/>
      <Metric icon={<Inbox/>} label="Offers ready" value={String(ready)}/>
      <Metric icon={<CalendarDays/>} label="Active term deposits" value={String(contracts.length)}/>
    </div>
    <div className="deposit-products">{products.map(product => {
      const active = contracts.filter(c => c.product === product)
      const balance = product === 'Savings' ? game.accounts.reduce((sum, amount) => sum + amount, 0)
        : product === 'Current' ? game.currentBalance ?? 0 : active.reduce((sum, c) => sum + c.balance, 0)
      const wait = daysUntilOffer(game, product)
      return <section className="card deposit-product" key={product}>
        <div className="card-head"><h2>{product} deposits</h2><strong>{money(balance, true)}</strong></div>
        <p>{descriptions[product]}</p>
        {product === 'Savings' && <p>{game.lastWalkIns !== undefined && <><strong>{game.lastWalkIns}</strong> new savers on Day {game.settled}. </>}Expect {dailySavers(game.savingsRate)} per day on average.</p>}
        {active.map(c => <p key={c.opened}>{c.customer && <strong>{c.customer} · </strong>}{money(c.balance, true)} at {pct(c.rate ?? (c.product === 'Fixed' ? 650 : 550))} matures on Day {c.maturity}.</p>)}
        {!closed && <p>{wait ? 'Next customer' : 'Offer from'} <strong>{depositCustomer(game, product)}</strong></p>}
        <div className="deposit-actions">
          <button className="primary small" disabled={closed || wait > 0} onClick={() => clock.decide(g => acceptDeposit(g, product))}>
            {wait ? 'Next offer on Day ' + (game.day + wait) : 'Accept ' + money(openingAmount[product]) + ' deposit'}
          </button>
          {product !== 'Current' && <button className="secondary small" disabled={closed} onClick={() => openRate(product)}>Set {product.toLowerCase()} rate</button>}
        </div>
      </section>
    })}</div>
  </>
}
