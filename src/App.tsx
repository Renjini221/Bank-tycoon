import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowRightToLine, BookOpen, BookOpenText, CalendarDays, CheckCheck, ChevronDown, CircleHelp, ClipboardList, Clock3, Landmark, Layers3, FileChartColumnIncreasing, LayoutDashboard, MapPin, Pause, PiggyBank, ShieldCheck, UserRound } from 'lucide-react'
import { archiveCurrentScores, clock, getLocalStatus, onLocalStatus, useAccount } from './store'
import { Trophy } from 'lucide-react'
import { Leaderboard } from './components/Leaderboard'
import { InvestmentDesk, InvestmentReview } from './components/InvestmentDesk'
import { DepositsDesk } from './components/DepositsDesk'
import { Management } from './components/Management'
import { DAY_MS, EQUITY_TARGET, SPEEDS } from './game/config'
import { decideOffer, equity, invest, newGame, setRate } from './game/model'
import { money } from './game/format'
import { Detail, Ledger, LoanDesk, Overview, ReportLines, Reports, type Dialog, type View } from './components/BankPanels'
import { AccountPanel, Conflict, EventDetails, Guide, LoanReview, RateForm } from './components/Dialogs'
import { Modal } from './components/Modal'
import { BankNameForm, PlayerForm } from './components/PlayerForm'
import type { Speed } from './game/clock'

const tabs = [{ name: 'Overview', icon: LayoutDashboard }, { name: 'Deposits Desk', icon: PiggyBank }, { name: 'Loan Desk', icon: ClipboardList }, { name: 'Investment Desk', icon: Layers3 }, { name: 'Ledger', icon: BookOpenText }, { name: 'Reports', icon: FileChartColumnIncreasing }, { name: 'Management', icon: UserRound }, { name: 'Leaderboard', icon: Trophy }] as const
const titles = { Leaderboard: 'Leaderboard', 'Deposits Desk': 'Deposits desk', 'Investment Desk': 'Investment desk', Management: 'Branch management', Overview: 'Branch overview', 'Loan Desk': 'Loan desk', Ledger: 'Branch ledger', Reports: 'Financial reports' }
function GameClock() {
  const { game, speed, elapsed } = useSyncExternalStore(clock.subscribe, clock.get)
  const disabled = game.outcome !== 'open' || game.openReport !== null
  const clickDay = useRef<number | undefined>(undefined)
  return <section className="game-clock" aria-label="Game clock"><div className="clock-main">
    <div className="game-date"><span className="calendar"><CalendarDays size={20}/></span><div><strong>Day {String((game.day - 1) % 30 + 1).padStart(2,'0')}</strong><small>Month {Math.ceil(game.day / 30)} · Year 1</small></div></div>
    <div className="speed-controls" aria-label="Clock speed"><button aria-label="Pause" title="Pause" aria-pressed={speed === 0} className={speed === 0 ? 'active' : ''} onClick={() => clock.setSpeed(0)}><Pause size={14} fill="currentColor"/></button>{SPEEDS.map(s => <button key={s} aria-label={'Play at ' + s + ' times speed'} aria-pressed={speed === s} disabled={disabled} className={speed === s ? 'active' : ''} onClick={() => clock.setSpeed(s)}>{s}×</button>)}</div>
    <button className="primary next-day" disabled={disabled} onPointerDown={() => { clickDay.current = game.day }} onClick={() => { clock.next(clickDay.current ?? game.day); clickDay.current = undefined }}>Next day<ArrowRightToLine size={15}/></button></div>
    <div className="clock-bottom"><Clock3 size={11}/><span>{speed ? Math.ceil((DAY_MS - elapsed) / speed / 1000) + 's to next day' : 'Clock paused'}</span><div className="clock-track" role="progressbar" aria-label="Day remaining" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 * (1 - elapsed / DAY_MS))}><i style={{ width: (100 * (1 - elapsed / DAY_MS)) + '%' }}/></div></div>
  </section>
}
export default function App() {
  const game = useSyncExternalStore(clock.subscribe, () => clock.get().game)
  const local = useSyncExternalStore(onLocalStatus, getLocalStatus)
  const account = useAccount()
  const [view,setView] = useState<View>('Overview')
  const [pendingView,setPendingView] = useState<View | null>(null)
  const selectedView = pendingView ?? view
  const [dialog,setDialog] = useState<Dialog | null>(null)
  const [outcomeSeen,setOutcomeSeen] = useState(false)
  const [toast,setToast] = useState('')
  const resume = useRef<Speed>(0)
  useEffect(() => {
    const hidden = () => { if (document.hidden) resume.current = 0 }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [])
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) } }, [toast])
  useEffect(() => {
    if (!pendingView) return
    const timer = window.setTimeout(() => {
      setView(pendingView)
      setPendingView(null)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [pendingView])
  const navigate = (v: View) => {
    if (v !== selectedView) setPendingView(v)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const open = (d: Dialog) => { if (!dialog) resume.current = clock.get().speed; clock.setSpeed(0); setDialog(d) }
  const close = () => {
    setDialog(null)
    if (resume.current && !document.hidden) clock.setSpeed(resume.current)
    resume.current = 0
  }
  const reset = () => {
    let message = 'Your new branch is open.'
    try { archiveCurrentScores() } catch { message += ' This device could not archive the previous scores.' }
    resume.current = 0; setDialog(null); setOutcomeSeen(false); navigate('Overview')
    clock.restore({ version: 1, elapsed: 0, game: newGame() }); clock.setSpeed(1); setToast(message)
  }
  const selectedReport = game.openReport ?? (dialog?.type === 'report' ? dialog.month : null)
  const report = game.reports.find(r => r.month === selectedReport)
  const offer = dialog?.type === 'loan' ? game.offers.find(o => o.id === dialog.id) : null
  const cloudStatus = account.sync?.status
  const syncText = cloudStatus === 'synced' ? 'Cloud save synced' : cloudStatus === 'error' ? 'Cloud sync failed' : cloudStatus === 'conflict' ? 'Save choice needed' : cloudStatus ? 'Syncing cloud save' : ''
  if (account.loading) return <main className="tab-loading" role="status"><span className="loading-spinner"/>Opening your account…</main>
  const savedName = account.user?.user_metadata?.bank_name
  const bankName = typeof savedName === 'string' ? savedName.trim() : ''
  if (account.user ? !bankName : !account.guest) return <main className="welcome-screen"><section className="card welcome-card">
    <div className="welcome-brand"><img src="/bank.svg" width="38" height="38" alt=""/><h1>Banking Tycoon</h1></div>
    <div className="welcome-body">{account.user ? <BankNameForm key={account.user.id} account={account}/> : <><PlayerForm account={account}/><button className="secondary wide" onClick={() => { setDialog(null); account.playGuest() }}>Continue as guest</button></>}</div>
  </section></main>
  let modal = null
  if (cloudStatus === 'conflict') modal = <Modal title="Choose your save" close={() => {}} locked><Conflict account={account} game={game}/></Modal>
  else if (report) {
    const dismiss = () => { if (game.openReport !== null) { clock.decide(g => ({ ...g, openReport: null })); setDialog(null); resume.current = 0 } else close() }
    modal = <Modal title={'Month ' + report.month + ' statement'} close={dismiss}><p className="story">Closing position after Day {report.month * 30}.</p><ReportLines report={report}/><button className="primary wide" onClick={dismiss}>Return to branch</button>
      {game.openReport !== null && game.outcome === 'completed' && <button className="secondary wide" onClick={() => { dismiss(); setOutcomeSeen(true); navigate('Leaderboard') }}><Trophy size={16}/>View leaderboard</button>}
    </Modal>
  } else if (game.outcome !== 'open' && !outcomeSeen) {
    const ended = game.outcome === 'failed'
    modal = <Modal title={ended ? 'The branch ran short of cash' : 'Your first year is complete'} close={() => setOutcomeSeen(true)}><p className="story">{ended ? 'A withdrawal on Day ' + game.day + ' exceeded the cash in your vault. The bank closed with a shortfall of ' + money(game.shortfall,true) + '.' : 'Your branch met every withdrawal for 360 days. ' + (equity(game) >= EQUITY_TARGET ? 'You also reached the ₹2,00,000 equity goal.' : 'Your closing statement is ready.')}</p><Detail label="Closing cash">{money(game.cash,true)}</Detail><Detail label="Closing equity">{money(equity(game),true)}</Detail><div className="modal-actions"><button className="secondary" onClick={() => { setOutcomeSeen(true); navigate('Ledger') }}>View ledger</button><button className="primary" onClick={reset}>Start new bank</button></div></Modal>
  } else if (dialog?.type === 'loan' && offer) modal = <Modal title="Review application" close={close}><LoanReview game={game} offer={offer} decide={approve => { clock.decide(g => decideOffer(g,offer.id,approve)); setToast(offer.name + '’s application ' + (approve ? 'approved.' : 'declined.')); close() }}/></Modal>
  else if (dialog?.type === 'investment') {
    const orderId = game.ledger.length
    modal = <Modal title="Review investment" close={close}><InvestmentReview game={game} security={dialog.security} buy={amount => {
      clock.decide(g => invest(g,dialog.security,amount,orderId))
      if (clock.get().game.investments?.some(h => h.id === orderId)) {
        setToast('Investment added to your holdings.'); close()
      }
    }}/></Modal>
  }
  else if (dialog?.type === 'rate') {
    const product = dialog.product ?? 'Savings'
    modal = <Modal title={'Adjust '+product.toLowerCase()+' rate'} close={close}><RateForm game={game} product={product} submit={rate => { clock.decide(g => setRate(g,rate,product)); setToast(product+' rate confirmed.'); close() }}/></Modal>
  }
  else if (dialog?.type === 'event') modal = <Modal title="Branch bulletin" close={close}><EventDetails game={game}/></Modal>
  else if (dialog?.type === 'guide') modal = <Modal title="How to play" close={close}><Guide/><button className="primary wide" onClick={close}>Back to branch</button></Modal>
  else if (dialog?.type === 'account') modal = <Modal title="Player account" close={close}><AccountPanel account={account} local={local} restart={() => setDialog({ type:'restart' })}/></Modal>
  else if (dialog?.type === 'restart') modal = <Modal title="Start a new bank?" close={close}><p className="story">This replaces your current bank and its ledger with a fresh Day 1. A connected cloud save will also be updated.</p><div className="modal-actions"><button className="secondary" onClick={close}>Keep current bank</button><button className="primary" onClick={reset}>Start new bank</button></div></Modal>
  return <><header className="site-header"><div className="header-inner"><button className="brand" onClick={() => navigate('Overview')} aria-label="Banking Tycoon overview"><img src="/bank.svg" alt="" width="39" height="39"/><span>Banking Tycoon</span></button>
    <nav aria-label="Main navigation">{tabs.map(({ name,icon: Icon }) => <button key={name} aria-current={selectedView === name ? 'page' : undefined} className={selectedView === name ? 'selected' : ''} onClick={() => navigate(name)}><Icon size={17}/>{name}</button>)}</nav>
    <div className="header-tools"><button className="help-button" title="How to play" aria-label="How to play" onClick={() => open({ type: 'guide' })}><CircleHelp size={20}/></button><button className="profile" onClick={() => open({ type: 'account' })}><span className="avatar"><UserRound size={16}/></span><span>{account.user ? 'Account' : 'Guest'}</span><ChevronDown size={14}/></button></div></div></header>
    <main><div className="page-heading"><div>
      {bankName && selectedView !== 'Overview'
        ? <div className="desk-bank-name"><Landmark size={16} aria-hidden="true"/><span>{bankName}</span></div>
        : <div className="location"><MapPin size={13}/>Kochi branch <i/> Kerala</div>}
      <h1>{selectedView === 'Overview' && bankName ? bankName : titles[selectedView]}</h1>
    </div><GameClock/></div>
    {game.outcome !== 'open' && <button className="notice" onClick={() => setOutcomeSeen(false)}>{game.outcome === 'failed' ? 'Branch closed' : 'Year complete'} · View final results</button>}
    {pendingView ? <div className="card tab-loading" role="status"><span className="loading-spinner" aria-hidden="true"/>Loading {titles[pendingView].toLowerCase()}…</div> :
      view === 'Leaderboard' ? <Leaderboard key={account.user?.id ?? 'guest'} game={game} account={account}/> :
      view === 'Investment Desk' ? <InvestmentDesk game={game} review={security => open({ type:'investment',security })}/> : view === 'Deposits Desk' ? <DepositsDesk game={game} openRate={product => open({ type:'rate', product })}/> : view === 'Management' ? <Management game={game}/> : view === 'Overview' ? <Overview game={game} open={open} navigate={navigate}/> : view === 'Loan Desk' ? <LoanDesk game={game} open={open} navigate={navigate}/> : view === 'Ledger' ? <Ledger game={game}/> : <Reports game={game} open={open}/>}
    <footer><span><ShieldCheck size={15}/>{local}{syncText && ' · ' + syncText}</span><button onClick={() => open({ type:'guide' })}><BookOpen size={14}/>Game guide</button></footer></main>
    {toast && <div className="toast" role="status"><CheckCheck size={18}/>{toast}</div>}{modal}</>
}
