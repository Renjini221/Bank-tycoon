import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { equity, type Game } from '../game/model'
import { money } from '../game/format'

type Sample = { label: string; cash: number; equity: number }
function opening(g: Game): Sample[] {
  let cash = 0
  let balance = 0
  return g.ledger.filter(e => e.day === 1).map((e, index) => {
    cash += e.cashDelta
    if (e.kind === 'Capital') balance += e.amount
    return { label: index === 0 ? 'Capital' : e.kind === 'Deposit' ? 'Deposit ' + index : e.kind, cash, equity: balance }
  })
}
export function Chart({ game }: { game: Game }) {
  const [period, setPeriod] = useState(30)
  const [hover, setHover] = useState<number | null>(null)
  const id = useId().replace(/:/g, '')
  const samples: Sample[] = game.history.length ? game.history.slice(-period).map(p => ({ ...p, label: 'Day ' + p.day })) : opening(game)
  if (game.history.length && game.day > game.settled) samples.push({ label: 'Day ' + game.day, cash: game.cash, equity: equity(game) })
  const points = samples.slice(-period)
  const values = points.flatMap(p => [p.cash, p.equity])
  const top = Math.max(...values), bottom = Math.min(...values)
  const step = Math.max(2500_00, Math.ceil((top - bottom || top * 0.1 || 10000) / 3 / 2500_00) * 2500_00)
  const min = Math.floor(bottom / step) * step - (bottom === top ? step : 0)
  const max = Math.max(min + step * 3, Math.ceil(top / step) * step)
  const left = 46, right = 351, yTop = 13, floor = 108
  const x = (i: number) => left + i / Math.max(1, points.length - 1) * (right - left)
  const y = (n: number) => floor - (n - min) / (max - min) * (floor - yTop)
  const path = (key: 'cash' | 'equity') => points.map((p, i) => (i === 0 ? 'M' : 'L') + x(i) + ',' + y(p[key])).join(' ')
  const active = hover === null ? null : points[Math.min(hover, points.length - 1)]
  const tick = (n: number) => n >= 100000_00 ? '₹' + Number((n / 100000_00).toFixed(2)) + 'L' : '₹' + Number((n / 1000_00).toFixed(1)) + 'k'
  return <section className="card chart-card">
    <div className="card-head"><h2>Cash &amp; equity</h2><label className="select-wrap"><select aria-label="Chart period" value={period} onChange={e => { setPeriod(+e.target.value); setHover(null) }}><option value="30">30 days</option><option value="7">7 days</option></select><ChevronDown size={13}/></label></div>
    <div className="legend"><span><i className="line cash-line"/>Cash</span><span><i className="line equity-line"/>Equity</span></div>
    <div className="plot" onPointerLeave={() => setHover(null)}>
    <svg viewBox="0 0 362 137" role="img" aria-label={'Cash and equity chart. Cash ' + money(game.cash) + ', equity ' + money(equity(game))} onPointerMove={e => {
      const rect = e.currentTarget.getBoundingClientRect()
      setHover(Math.max(0, Math.min(points.length - 1, Math.round((((e.clientX - rect.left) / rect.width) * 362 - left) / (right - left) * (points.length - 1)))))
    }}>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#84ad84" stopOpacity=".33"/><stop offset="1" stopColor="#a7c3a4" stopOpacity=".04"/></linearGradient></defs>
      {[0, 1, 2, 3].map(i => { const val = min + (max - min) * i / 3; return <g key={i}><text x={left - 8} y={y(val) + 3} textAnchor="end">{tick(val)}</text><line x1={left} x2={right} y1={y(val)} y2={y(val)} stroke="#dfdfd4" strokeDasharray="3 4"/></g> })}
      <path d={path('cash') + ' L' + x(points.length - 1) + ',' + floor + ' L' + left + ',' + floor + ' Z'} fill={'url(#' + id + ')'}/>
      <path d={path('cash')} fill="none" stroke="#397458" strokeWidth="2.4" strokeLinejoin="round"/>
      <path d={path('equity')} fill="none" stroke="#b78648" strokeWidth="2" strokeDasharray="5 4"/>
      {points.length <= 7 && points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.cash)} r="3" fill="#fff" stroke="#397458" strokeWidth="1.8"/>)}
      {[...new Set([0, Math.round((points.length - 1) / 2), points.length - 1])].map(i => <text key={i} x={x(i)} y="129" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{points[i].label}</text>)}
    </svg>
    {active && <div className="plot-tip">{active.label} · Cash {money(active.cash)} · Equity {money(active.equity)}</div>}
    </div>
  </section>
}
