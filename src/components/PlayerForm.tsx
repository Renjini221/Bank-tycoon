import { useState, type FormEvent } from 'react'
import { bankNameLimit, defaultBankName, usernamePattern } from '../cloud/players'
import type { Account } from '../store'

export function PlayerForm({ account }: { account: Account }) {
  const [mode,setMode] = useState<'register' | 'login' | 'email'>('register')
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [bankName,setBankName] = useState('')
  const [email,setEmail] = useState('')
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState(false)
  function change(next: typeof mode) {
    setMode(next); setPassword(''); setMessage('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setMessage(''); setBusy(true)
    try {
      if (mode === 'register') {
        await account.register(username,password,bankName)
        change('login'); setMessage('Account created. Enter your password to log in.')
      } else if (mode === 'login') await account.login(username,password)
      else {
        await account.emailLink(email.trim())
        setMessage('Check your inbox for your sign-in link.')
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Connection failed. Please try again.') }
    finally { setBusy(false) }
  }
  return <form className="player-form" onSubmit={submit}>
    <h2>{mode === 'register' ? 'Create an account' : mode === 'login' ? 'Log in' : 'Email sign-in'}</h2>
    {mode === 'email' ? <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label> : <>
      <label>Username<input autoComplete="username" required minLength={3} maxLength={24} pattern={usernamePattern} title="3–24 letters, numbers or underscores" value={username} onChange={e=>setUsername(e.target.value)}/></label>
      <label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : 1} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {mode === 'register' && <><small>Choose a password with at least 8 characters.</small>
        <label>Bank name (optional)<input value={bankName} maxLength={bankNameLimit} placeholder="e.g. Malabar Bank" onChange={e=>setBankName(e.target.value)}/></label>
      </>}
    </>}
    {message && <p className="notice" role="status">{message}</p>}
    {!account.configured && <p className="notice">Cloud accounts are unavailable. You can play as a guest.</p>}
    <button className="primary wide" disabled={!account.configured || busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'login' ? 'Log in' : 'Send sign-in link'}</button>
    <button type="button" className="text-btn" disabled={busy} onClick={()=>change(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Already have an account? Log in' : 'Create a new account'}</button>
    {mode === 'login' && <button type="button" className="text-btn" disabled={busy} onClick={()=>change('email')}>Use an existing email-link account</button>}
  </form>
}

export function BankNameForm({account}: {account: Account}) {
  const [name,setName] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try { await account.nameBank(name.trim() || defaultBankName) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save your bank name. Please try again.') }
    finally { setBusy(false) }
  }
  return <form className="player-form" onSubmit={submit}>
    <h2>Name your bank</h2>
    <label>Bank name<input value={name} maxLength={bankNameLimit} placeholder={defaultBankName} onChange={e=>setName(e.target.value)}/></label>
    {error && <p className="notice" role="alert">{error}</p>}
    <button className="primary wide" disabled={busy}>{busy ? 'Saving…' : name.trim() ? 'Save bank name' : 'Use '+defaultBankName}</button>
  </form>
}
