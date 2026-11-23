import { useState } from 'react'
import { candidates, manageStaff, type Game } from '../game/model'
import { clock } from '../store'

export function Management({game}:{game:Game}) {
  const [confirm,setConfirm] = useState('')
  const closed = game.outcome !== 'open' || game.openReport !== null
  return <div className="management">
    <section className="card"><div className="card-head"><h2>Branch staff</h2></div><p className="staff-info">Each employee costs ₹80 per day and attracts ₹250 in extra daily deposits per skill level. Training adds one level, up to level 3.</p>
    {candidates.map(name=>{
      const level=game.staff?.[name] ?? 0
      return <article key={name}><h3>{name}</h3><p>{level ? 'Deposit officer · Level '+level : 'Available deposit officer'}</p>
      {level ? <><button className="secondary small" disabled={closed || level>=3 || game.cash<75000} onClick={()=>clock.decide(g=>manageStaff(g,name,'Train'))}>{level===3?'Fully trained':'Train · ₹750'}</button> <button className="secondary small" disabled={closed} onClick={()=>{if(confirm===name){clock.decide(g=>manageStaff(g,name,'Fire'));setConfirm('')}else setConfirm(name)}}>{confirm===name?'Confirm firing':'Fire'}</button>{confirm===name && <button className="text-btn" onClick={()=>setConfirm('')}>Cancel</button>}</> : <button className="secondary small" disabled={closed || game.cash<50000} onClick={()=>clock.decide(g=>manageStaff(g,name,'Hire'))}>Hire · ₹500</button>}</article>
    })}</section></div>
}
