import { DIFFICULTY, STARTING_CAPITAL, YEAR_DAYS } from './config'
import { minimumInvestment, securities, type Investment, type Security } from './investments'

export type Risk = 'Low' | 'Medium' | 'High'
export type Trade = 'bakery' | 'fishing' | 'textiles' | 'farm' | 'shop' | 'transport'
export type Application = {
  id: string; name: string; purpose: string; story: string; trade: Trade
  amount: number; rate: number; term: number; interval: number; risk: Risk; expires: number
}
export type Loan = Application & { remaining: number; nextDue: number; lastPaid: number; misses: number }
export type Kind = 'Capital' | 'Deposit' | 'Loan issued' | 'Principal' | 'Loan interest' | 'Savings interest' | 'Withdrawal' | 'Expense' | 'Loan loss' | 'Notice' | 'Investment purchase' | 'Investment redemption' | 'Investment interest'
export type Entry = { day: number; kind: Kind; note: string; amount: number; cashDelta: number }
export type Report = { month: number; earned: number; investmentIncome?: number; savings: number; expenses: number; losses: number; profit: number; closingCash: number; equity: number }
export type Point = { day: number; cash: number; equity: number }
export type Product = 'Savings' | 'Current' | 'Fixed' | 'Recurring'
export type InterestProduct = Exclude<Product, 'Current'>
export type Contract = { product: 'Fixed' | 'Recurring'; balance: number; opened: number; maturity: number; rate?: number; customer?: string }
const defaultRates = { Savings: 400, Fixed: 650, Recurring: 550 }
const demandProducts = ['Savings', 'Fixed', 'Recurring'] as const
const demandPerSaver = 200
export const dailySavers = (rate: number) => rate / demandPerSaver
export const offerInterval = (product: InterestProduct, rate: number) => Math.ceil(7 * defaultRates[product] / rate)
export const openingAmount = { Savings: 500000, Current: 1200000, Fixed: 2000000, Recurring: 200000 }
const deskCustomers = [
  'Adithya', 'Aparna', 'Rizwan', 'Merin', 'Gokul',
  'Nandu', 'Sama', 'Haari', 'Hasjan', 'Devanandan',
  'Anagha', 'Basil', 'Fidha', 'Kiran', 'Nimisha',
  'Roshan', 'Athira', 'Jithin', 'Nahla', 'Vishnu',
  'Aleena', 'Ashwin', 'Farhan', 'Gowri', 'Nikhil',
  'Parvathy', 'Rohit', 'Sneha', 'Thasneem', 'Varun',
  'Amal', 'Diya', 'Irfan', 'Joel', 'Keerthana',
  'Liya', 'Midhun', 'Neethu', 'Riyas', 'Sreelakshmi',
  'Abhinav', 'Christina', 'Deepak', 'Hiba', 'Krishna',
  'Malavika', 'Navaneeth', 'Rehana', 'Sandra', 'Yadhu',
  'Anjali', 'Danish', 'Elsa', 'Haritha', 'Joseph',
  'Manjima', 'Naveen', 'Roshni', 'Sanjay', 'Zoya',
]
const offerSlot: Record<Product, number> = { Savings: 0, Current: 1, Fixed: 2, Recurring: 3 }
const offerSlots = Object.keys(offerSlot).length
export const candidates = ['Asha Nair', 'Vinod Das', 'Mary Joseph']
export type Game = {
  customerQueue?: string[]
  investments?: Investment[]
  termRates?: Partial<Record<'Fixed' | 'Recurring', number>>
  offerDemand?: Partial<Record<InterestProduct, number>>
  saverDemand?: number; lastWalkIns?: number
  currentBalance?: number; contracts?: Contract[]; accepted?: Partial<Record<Product,number>>; staff?: Record<string,number>
  version: 1; day: number; settled: number; seed: number; cash: number; savingsRate: number
  accounts: number[]; offers: Application[]; loans: Loan[]; ledger: Entry[]; history: Point[]
  reports: Report[]; openReport: number | null; outcome: 'open' | 'failed' | 'completed'; shortfall: number
}
type Profile = Pick<Application, 'name' | 'purpose' | 'story' | 'trade' | 'risk'>
const profiles: Profile[] = [
  { name: 'Anitha Nair', purpose: 'Bakery expansion', trade: 'bakery', risk: 'Low', story: 'Anitha has supplied tea shops for eight years. A second oven would help fill confirmed Onam orders, but festival demand will taper off.' },
  { name: 'Rajan Joseph', purpose: 'Fishing boat repairs', trade: 'fishing', risk: 'Medium', story: 'Rajan needs a new engine for his family’s boat. A fish merchant has agreed to buy his catch, although rough seas can keep the boat ashore.' },
  { name: 'Meera Menon', purpose: 'Textile inventory', trade: 'textiles', risk: 'High', story: 'Meera wants to stock handloom saris for a new shop. The margin is attractive, but most of her savings are tied up in unsold stock.' },
  { name: 'Fathima Basheer', purpose: 'Spice shop stock', trade: 'shop', risk: 'Low', story: 'A long-standing grocer can buy cardamom at a seasonal discount. Her regular customers provide steady sales, but prices fluctuate.' },
  { name: 'Manu Varghese', purpose: 'Pepper harvest', trade: 'farm', risk: 'Medium', story: 'Manu needs pickers to bring in a mature pepper crop. A buyer is lined up, but heavy rain could delay the harvest.' },
  { name: 'Leela Das', purpose: 'Ferry refurbishment', trade: 'transport', risk: 'High', story: 'Leela is converting a ferry for tourist trips. Early bookings are promising, but the boatyard has missed deadlines before.' },
  { name: 'Devika Pillai', purpose: 'Catering equipment', trade: 'bakery', risk: 'Low', story: 'Devika has signed catering contracts with two schools. A larger stove will help fulfil them, though school holidays reduce her income.' },
  { name: 'Saji Antony', purpose: 'Cold storage boxes', trade: 'fishing', risk: 'Medium', story: 'Saji sells fresh fish at the harbour. Better storage reduces spoilage, but his wholesale prices change with each landing.' },
  { name: 'Rukmini Devi', purpose: 'Handloom upgrade', trade: 'textiles', risk: 'Medium', story: 'Rukmini has a cooperative order for new mundus. An extra loom would speed delivery, provided yarn prices stay steady.' },
]
const firstAmounts = [25_000_00, 40_000_00, 60_000_00]
const annualRates = { Low: 1800, Medium: 2400, High: 3200 }
const depositors = ['Lakshmi Nair', 'Harbour Stores', 'Mathew Thomas', 'Kavitha Das', 'Kochi Co-operative', 'Amina Rahman']

const liquidDeposits = (g: Game) => g.accounts.reduce((a,b) => a+b, g.currentBalance ?? 0)
export const deposits = (g: Game) => liquidDeposits(g) + (g.contracts ?? []).reduce((sum,c) => sum+c.balance,0)
export function productRate(g: Game, product: InterestProduct) {
  return product === 'Savings' ? g.savingsRate : g.termRates?.[product] ?? defaultRates[product]
}
function demandCredit(g: Game, product: InterestProduct) {
  const last = g.accepted?.[product] ?? g.day - 7
  return g.offerDemand?.[product] ?? Math.min(7, g.day - last) * defaultRates[product]
}
export function daysUntilOffer(g: Game, product: Product) {
  if (product === 'Current') return Math.max(0, (g.accepted?.Current ?? -7) + 7 - g.day)
  return Math.max(0, Math.ceil((7 * defaultRates[product] - demandCredit(g, product)) / productRate(g, product)))
}
export function depositCustomer(g: Game, product: Product) {
  return (g.customerQueue ?? deskCustomers)[offerSlot[product]]
}
export function acceptDeposit(state: Game, product: Product): Game {
  if (state.outcome !== 'open' || state.openReport !== null || daysUntilOffer(state, product) > 0) return state
  const g = { ...state, ledger: [...state.ledger], accounts: [...state.accounts], accepted: {...state.accepted, [product]:state.day} }
  const amount = openingAmount[product]
  const customer = depositCustomer(state, product)
  // The first four slots hold the displayed offers. Replace only the one accepted.
  const queue = [...(state.customerQueue ?? deskCustomers)]
  const [next] = queue.splice(offerSlots, 1)
  queue[offerSlot[product]] = next
  queue.push(customer)
  g.customerQueue = queue
  if (product !== 'Current') g.offerDemand = { ...state.offerDemand, [product]: 0 }
  if (product === 'Savings') g.accounts.push(amount)
  else if (product === 'Current') g.currentBalance = (g.currentBalance ?? 0) + amount
  else g.contracts = [...(g.contracts ?? []), {product,balance:amount,opened:g.day,maturity:g.day+30,rate:productRate(g,product),customer}]
  record(g,'Deposit',product+' account opened · '+customer,amount,amount)
  return g
}
export function manageStaff(state: Game,name: string, action: 'Hire'|'Train'|'Fire'): Game {
  const level = state.staff?.[name] ?? 0
  const cost = action === 'Hire' ? 50000 : action === 'Train' ? 75000 : 0
  if (!candidates.includes(name) || state.outcome !== 'open' || state.openReport !== null || state.cash < cost || (action === 'Hire' ? level > 0 : !level) || (action === 'Train' && level >= 3)) return state
  const g = {...state,staff:{...state.staff},ledger:[...state.ledger]}
  if (action === 'Fire') delete g.staff[name]
  else g.staff[name] = level+1
  record(g,cost ? 'Expense' : 'Notice',action+' ? '+name,cost,-cost)
  return g
}
export const principal = (g: Game) => g.loans.reduce((n, l) => n + l.remaining, 0)
export const investedPrincipal = (g: Game) => (g.investments ?? []).reduce((sum, h) => sum + h.amount, 0)
export const equity = (g: Game) => g.cash + principal(g) + investedPrincipal(g) - deposits(g)
export const annualInterest = (balance: number, rate: number, days = 1) => Math.round(balance * rate * days / (10_000 * YEAR_DAYS))
export const savingsCost = (g: Game, rate: number) => g.accounts.reduce((v, a) => v + annualInterest(a, rate), 0)

function nextRandom(g: Pick<Game, 'seed'>) {
  g.seed = (Math.imul(g.seed, 1_664_525) + 1_013_904_223) >>> 0
  return g.seed / 4_294_967_296
}
function record(g: Game, kind: Kind, note: string, amount: number, cashDelta = 0) {
  g.cash += cashDelta
  g.ledger.push({ day: g.day, kind, note, amount, cashDelta })
}
export function invest(state: Game, security: Security, amount: number, orderId: number): Game {
  const issue = securities[security]
  if (state.outcome !== 'open' || state.openReport !== null || orderId !== state.ledger.length ||
      !issue || state.day + issue.term > YEAR_DAYS || !Number.isSafeInteger(amount) ||
      amount % 100 !== 0 || amount < minimumInvestment || amount > state.cash) return state
  const holding: Investment = {
    id: orderId, security, amount, opened: state.day, maturity: state.day + issue.term,
    interest: annualInterest(amount, issue.rate, issue.term),
  }
  const g = { ...state, investments: [...(state.investments ?? []), holding], ledger: [...state.ledger] }
  record(g, 'Investment purchase', issue.name, amount, -amount)
  return g
}
function redeemInvestments(g: Game) {
  g.investments = (g.investments ?? []).filter(holding => {
    if (holding.maturity !== g.day) return true
    const name = securities[holding.security].name
    record(g, 'Investment redemption', name, holding.amount, holding.amount)
    record(g, 'Investment interest', name, holding.interest, holding.interest)
    return false
  })
}
export function receiveDeposit(g: Game, amount: number, account = 0) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid deposit')
  g.accounts[account] += amount
  record(g, 'Deposit', depositors[account], amount, amount)
}
function makeOffer(index: number, day: number, amount: number): Application {
  const p = profiles[index]
  return { ...p, id: day + '-' + index, amount, rate: annualRates[p.risk], term: p.risk === 'High' ? 90 : p.risk === 'Medium' ? 60 : 30, interval: 10, expires: day + 3 + index % 3 }
}
export function newGame(seed = Math.floor(Math.random() * 4_294_967_296)): Game {
  const customerQueue = [...deskCustomers]
  const shuffle = { seed }
  for (let i = customerQueue.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(shuffle) * (i + 1))
    ;[customerQueue[i], customerQueue[j]] = [customerQueue[j], customerQueue[i]]
  }
  const g: Game = { version: 1, day: 1, settled: 0, seed, cash: 0, savingsRate: 400,
    customerQueue,
    accounts: depositors.map(() => 0), offers: firstAmounts.map((amount, i) => makeOffer(i, 1, amount)), loans: [],
    ledger: [], history: [], reports: [], openReport: null, outcome: 'open', shortfall: 0 }
  record(g, 'Capital', 'Founding capital', STARTING_CAPITAL, STARTING_CAPITAL)
  ;[20_000_00, 18_000_00, 12_000_00].forEach((v, i) => receiveDeposit(g, v, i))
  return g
}
export function decideOffer(state: Game, id: string, approve: boolean): Game {
  const offer = state.offers.find(o => o.id === id)
  if (!offer || state.outcome !== 'open' || state.openReport !== null || (approve && offer.amount > state.cash)) return state
  const g = { ...state, offers: state.offers.filter(o => o.id !== id), loans: [...state.loans], ledger: [...state.ledger] }
  if (approve) {
    g.loans.push({ ...offer, remaining: offer.amount, nextDue: g.day + offer.interval, lastPaid: g.day, misses: 0 })
    record(g, 'Loan issued', offer.name, offer.amount, -offer.amount)
  } else {
    record(g, 'Notice', 'Application declined · ' + offer.name, 0)
  }
  return g
}
export function setRate(state: Game, rate: number, product: InterestProduct = 'Savings'): Game {
  if (state.outcome !== 'open' || state.openReport !== null || !Number.isInteger(rate) || rate < 100 || rate > 900 || rate === productRate(state,product)) return state
  const g = { ...state, ledger: [...state.ledger] }
  if (product === 'Savings') g.savingsRate = rate
  else g.termRates = { ...g.termRates, [product]: rate }
  record(g, 'Notice', product + ' rate set to ' + (rate / 100) + '%', 0)
  return g
}
export type LocalEvent = { title: string; start: number; end: number; type: 'festival' | 'boom'; detail: string }
export function eventFor(day: number): LocalEvent {
  const cycle = Math.floor((day - 1) / 60) * 60
  const festival = (base: number): LocalEvent => ({ title: base === 0 ? 'Onam festival' : 'Temple festival', start: base + 4, end: base + 6, type: 'festival', detail: 'Families are preparing for the festivities. Expect higher withdrawals.' })
  if (day <= cycle + 6) return festival(cycle)
  if (day <= cycle + 24) return { title: 'Harbour trade boom', start: cycle + 18, end: cycle + 24, type: 'boom', detail: 'New orders are reaching Kochi’s merchants. Expect larger deposits and more borrowers.' }
  return festival(cycle + 60)
}
export function payment(loan: Loan, day: number) {
  return { principal: Math.min(loan.remaining, Math.ceil(loan.amount * loan.interval / loan.term)),
    interest: annualInterest(loan.remaining, loan.rate, day - loan.lastPaid) }
}
export function forecast(g: Game, day = g.day + 1) {
  const event = eventFor(day)
  const activeFestival = event.type === 'festival' && day >= event.start
  const base = Math.round((DIFFICULTY.minimumWithdrawal + liquidDeposits(g) * DIFFICULTY.withdrawalShare) / 10_000) * 10_000
  const known = Math.min(liquidDeposits(g), (day % 5 === 0 ? 4_500 : 1_500) * 100)
  const low = Math.min(liquidDeposits(g), known + base * (activeFestival ? 2 : 0.5))
  const high = Math.min(liquidDeposits(g), known + base * (activeFestival ? 4 : 1.5))
  const repayments = g.loans.filter(l => l.nextDue === day).reduce((sum, l) => {
    const due = payment(l, day)
    return sum + due.principal + due.interest
  }, 0)
  const maturity = (g.contracts ?? []).filter(c => c.maturity === day).reduce((sum,c) => {
    let balance = c.balance
    for (let d=g.day; d<=day; d++) balance += annualInterest(balance,c.rate ?? defaultRates[c.product])
    return sum+balance
  },0)
  const investmentPayout = (g.investments ?? []).reduce((sum, h) =>
    h.maturity === day ? sum + h.amount + h.interest : sum, 0)
  return { known:known+maturity, low:Math.round(low)+maturity, high:Math.round(high)+maturity, repayments, maturity, investmentPayout }
}
function collectLoans(g: Game) {
  for (const l of g.loans) {
    if (l.nextDue !== g.day) continue
    if (nextRandom(g) < DIFFICULTY.missChance[l.risk]) {
      l.misses++
      if (l.misses >= DIFFICULTY.consecutiveMissesToDefault) {
        record(g, 'Loan loss', l.name + ' · remaining principal written off', l.remaining)
        l.remaining = 0
      } else {
        l.nextDue = g.day + 3
        record(g, 'Notice', l.name + ' missed a payment · retry on Day ' + l.nextDue, 0)
      }
      continue
    }
    const due = payment(l, g.day)
    l.remaining -= due.principal
    record(g, 'Principal', l.name, due.principal, due.principal)
    record(g, 'Loan interest', l.name, due.interest, due.interest)
    l.lastPaid = g.day
    l.nextDue = g.day + l.interval
    l.misses = 0
  }
  g.loans = g.loans.filter(l => l.remaining > 0)
}
export function monthReport(g: Game, month: number): Report {
  const totals = { earned: 0, investmentIncome: 0, savings: 0, expenses: 0, losses: 0 }
  const kinds = { 'Loan interest': 'earned', 'Investment interest': 'investmentIncome', 'Savings interest': 'savings', Expense: 'expenses', 'Loan loss': 'losses' } as const
  for (const e of g.ledger) {
    if (Math.ceil(e.day / 30) === month && e.kind in kinds) totals[kinds[e.kind as keyof typeof kinds]] += e.amount
  }
  return { month, ...totals, profit: totals.earned + totals.investmentIncome - totals.savings - totals.expenses - totals.losses, closingCash: g.cash, equity: equity(g) }
}
export function settleDay(state: Game, expectedDay: number): Game {
  if (state.outcome !== 'open' || state.openReport !== null || state.day !== expectedDay || state.settled >= expectedDay) return state
  const g: Game = { ...state, accounts: [...state.accounts], loans: state.loans.map(l => ({ ...l })), ledger: [...state.ledger], history: [...state.history], reports: [...state.reports] }
  const estimate = forecast(g, g.day)
  const event = eventFor(g.day)
  const boom = event.type === 'boom' && g.day >= event.start
  const demand = (g.saverDemand ?? 0) + g.savingsRate
  g.lastWalkIns = Math.floor(demand / demandPerSaver)
  g.saverDemand = demand % demandPerSaver
  const openingDeposit = (boom ? 1360 : 800) * 100
  for (let i = 0; i < g.lastWalkIns; i++) {
    g.accounts.push(openingDeposit)
    record(g, 'Deposit', 'New savings customer · account ' + g.accounts.length, openingDeposit, openingDeposit)
  }
  g.offerDemand = { ...g.offerDemand }
  for (const product of demandProducts) {
    g.offerDemand[product] = Math.min(7 * defaultRates[product], demandCredit(state,product) + productRate(g,product))
  }
  const incoming = Math.round((2200 + nextRandom(g) * 3300 + g.day * DIFFICULTY.dailyDepositGrowth / 100) * (boom ? 1.7 : 1)) * 100
  const levels = Object.values(g.staff ?? {})
  receiveDeposit(g, incoming + levels.reduce((sum,level) => sum+level*25000,0), Math.floor(nextRandom(g) * depositors.length))
  g.contracts = (g.contracts ?? []).map(contract => {
    const c = {...contract}
    const age = g.day-c.opened
    if (c.product === 'Recurring' && age > 0 && age < 30 && age % 10 === 0) {
      c.balance += openingAmount.Recurring
      const note = c.customer ? 'Recurring instalment · '+c.customer : 'Recurring instalment'
      record(g,'Deposit',note,openingAmount.Recurring,openingAmount.Recurring)
    }
    return c
  })
  collectLoans(g)
  redeemInvestments(g)
  let interest = savingsCost(g, g.savingsRate)
  g.accounts = g.accounts.map(a => a + annualInterest(a, g.savingsRate))
  for (const c of g.contracts) {
    const credit = annualInterest(c.balance,c.rate ?? defaultRates[c.product])
    c.balance += credit
    interest += credit
  }
  record(g,'Savings interest','Interest credited to depositors',interest)
  const maturity = g.contracts.filter(c => c.maturity === g.day).reduce((sum,c) => sum+c.balance,0)
  const withdrawal = maturity + Math.min(liquidDeposits(g), Math.round((estimate.low - estimate.maturity + nextRandom(g) * (estimate.high - estimate.low)) / 100) * 100)
  if (withdrawal > g.cash) {
    g.shortfall = withdrawal - g.cash
    g.outcome = 'failed'
    record(g, 'Notice', 'Withdrawal could not be paid', withdrawal)
  } else {
    g.contracts = g.contracts.filter(c => c.maturity !== g.day)
    let remaining = withdrawal-maturity
    const currentDebit = Math.min(remaining,g.currentBalance ?? 0)
    g.currentBalance = (g.currentBalance ?? 0)-currentDebit
    remaining -= currentDebit
    const start = Math.floor(nextRandom(g) * g.accounts.length)
    for (let i = 0; remaining > 0 && i < g.accounts.length; i++) {
      const account = (start + i) % g.accounts.length
      const debit = Math.min(g.accounts[account], remaining)
      g.accounts[account] -= debit
      remaining -= debit
    }
    record(g, 'Withdrawal', event.type === 'festival' && g.day >= event.start ? 'Festival withdrawals' : 'Customer withdrawals', withdrawal, -withdrawal)
    if (levels.length) record(g,'Expense','Staff payroll',levels.length*8000,-levels.length*8000)
    record(g, 'Expense', 'Daily branch operations', DIFFICULTY.dailyExpense, -DIFFICULTY.dailyExpense)
  }
  g.settled = g.day
  g.history = [...g.history.slice(-29), { day: g.day, cash: g.cash, equity: equity(g) }]
  if (g.day % 30 === 0) {
    const month = g.day / 30
    g.reports.push(monthReport(g, month))
    g.openReport = month
  }
  if (g.outcome !== 'open') return g
  if (g.day === YEAR_DAYS) { g.outcome = 'completed'; return g }
  g.day++
  g.offers = state.offers.filter(o => o.expires >= g.day)
  if ((g.day % 2 === 0 || boom) && g.offers.length < 6) {
    const index = Math.floor(nextRandom(g) * profiles.length)
    const amount = (20 + Math.floor(nextRandom(g) * 44) + Math.floor(g.day / 5)) * 1000_00
    g.offers.push(makeOffer(index, g.day, amount))
  }
  return g
}
