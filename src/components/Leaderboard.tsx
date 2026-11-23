import { useEffect, useState } from 'react'
import { ChartNoAxesColumnIncreasing, Landmark, Medal, RefreshCw, Trophy } from 'lucide-react'
import { money } from '../game/format'
import { yearEndScore, deviceRanking, type BankRank } from '../game/leaderboard'
import { STARTING_CAPITAL, YEAR_DAYS } from '../game/config'
import type { Game } from '../game/model'
import { deviceRunHistory, type Account } from '../store'
import { Metric } from './BankPanels'

function Standings({ rows, shared }: { rows: BankRank[]; shared: boolean }) {
  if (!rows.length) return <div className="empty-state"><Trophy/><strong>{shared ? 'No banks have posted a year-end score yet' : 'No completed years on this device yet'}</strong></div>
  return <div className="table-scroll"><table className="rank-table"><thead><tr><th>Rank</th><th>{shared ? 'Bank' : 'Run'}</th><th>Year-end equity</th><th>Gain / loss</th></tr></thead>
    <tbody>{rows.map((row,i) => <tr key={i} className={row.is_you ? 'own-rank' : undefined}>
      <td>{row.place === 1 && <Medal size={15} aria-hidden="true"/>} {row.place}</td>
      <td>{row.bank_name}{row.is_you && <strong className="rank-tag">{shared ? 'Your bank' : 'Current run'}</strong>}</td><td>{money(row.equity_paise,true)}</td><td>{money(row.equity_paise - STARTING_CAPITAL,true)}</td>
    </tr>)}</tbody></table></div>
}

function SharedBoard({ account, score }: { account: Account; score?: number }) {
  const [rows,setRows] = useState<BankRank[]>([])
  const [loading,setLoading] = useState(true)
  const [posting,setPosting] = useState(false)
  const [error,setError] = useState('')
  const [feedback,setFeedback] = useState('')
  const [refresh,setRefresh] = useState(0)
  const {readBoard} = account
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    readBoard().then(data => { if (active) setRows(data) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load the leaderboard.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [readBoard,refresh])
  async function post() {
    setPosting(true); setFeedback('')
    try {
      await account.postScore()
      setFeedback('Your best year-end score is on the board.')
      setRefresh(v => v + 1)
    } catch(e) { setFeedback(e instanceof Error ? e.message : 'Could not post your score. Try again.') }
    finally { setPosting(false) }
  }
  const best = rows.find(r => r.is_you)?.equity_paise
  const canImprove = score !== undefined && (best === undefined || score > best)
  return <>
    <div className="ranks-toolbar"><p>The top 25 banks, plus your rank. Each player keeps their highest posted year-end equity. Tied scores share a rank.</p>
      <button className="secondary small" disabled={loading || posting} onClick={() => setRefresh(v=>v+1)}><RefreshCw size={14}/>Refresh</button></div>
    {loading ? <p className="ranks-status" role="status">Loading shared scores…</p> : error ? <p className="notice" role="status">{error}</p> : <Standings rows={rows} shared/>}
    {!account.user ? <p className="ranks-status">Log in to post your bank’s year-end score.</p> : canImprove && !error &&
      <div className="post-score"><div><strong>Post your year-end equity of {money(score!,true)}</strong>
        <p>{account.sync?.status === 'synced' ? 'Players will see your bank name and closing equity.' : 'Sync your bank save to post this result.'}</p></div>
        <button className="primary small" disabled={loading || posting || account.sync?.status !== 'synced'} onClick={post}>{posting ? 'Posting…' : 'Post score'}</button></div>}
    {feedback && <p className="ranks-status" role="status">{feedback}</p>}
  </>
}

export function Leaderboard({ game, account }: { game: Game; account: Account }) {
  const score = yearEndScore(game)
  const [shared,setShared] = useState(Boolean(account.user))
  const [history] = useState(deviceRunHistory)
  const local = deviceRanking(history,score)
  return <>
    <div className="summary-strip">
      <Metric icon={<Landmark/>} label="Days survived" value={Math.max(0,game.settled - (game.outcome === 'failed' ? 1 : 0))+' / '+YEAR_DAYS}/>
      <Metric icon={<ChartNoAxesColumnIncreasing/>} label="Year-end equity" value={score === undefined ? '—' : money(score,true)}/>
      <Metric icon={<Trophy/>} label="Device best" value={local.length ? money(local[0].equity_paise,true) : '—'}/>
    </div>
    <section className="card leaderboard"><div className="card-head"><h2>Year-end standings</h2></div>
      <p className="ranks-status">Survive 360 days to qualify. Your score is closing cash plus outstanding loan principal, less all customer deposits owed.</p>
      <div className="ranks-switch" role="group" aria-label="Ranking scope">
        <button className={shared ? 'secondary small' : 'primary small'} aria-pressed={!shared} onClick={()=>setShared(false)}>My runs</button>
        <button className={shared ? 'primary small' : 'secondary small'} aria-pressed={shared} onClick={()=>setShared(true)}>Shared banks</button>
      </div>
      {game.outcome === 'failed' && <p className="ranks-status">Your branch closed on Day {game.settled}. This run did not qualify.</p>}
      {shared ? <SharedBoard account={account} score={score}/> : <Standings rows={local} shared={false}/>}
    </section>
  </>
}
