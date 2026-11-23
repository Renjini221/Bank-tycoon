import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { BankClock, isSave, type Save } from './game/clock'
import { CloudSync, type SyncState } from './cloud/sync'
import { cleanBankName, playerIdentity } from './cloud/players'
import { newGame } from './game/model'
import { yearEndScore, type BankRank } from './game/leaderboard'

export const STORAGE_KEY = 'banking-tycoon.v1'
let localKey = STORAGE_KEY
let localMessage = 'Saved on this device'
let restored: Save | undefined
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const parsed: unknown = JSON.parse(raw)
    if (!isSave(parsed)) throw new Error()
    restored = parsed
  }
} catch { localMessage = 'Previous save unavailable' }
export const clock = new BankClock(restored)
clock.setSpeed(0)
let freshGuest = !restored
const localListeners = new Set<() => void>()
export const getLocalStatus = () => localMessage
export function deviceRunHistory(): number[] {
  try {
    const data = JSON.parse(localStorage.getItem(localKey + '.scores') ?? '[]')
    if (!Array.isArray(data)) return []
    // Older local archives recorded one closing equity per survived month.
    return data.map(row => typeof row === 'number' ? row : row?.[12]).filter(Number.isSafeInteger)
  } catch { return [] }
}
export function archiveCurrentScores() {
  const score = yearEndScore(clock.get().game)
  if (score !== undefined) {
    localStorage.setItem(localKey + '.scores', JSON.stringify([...deviceRunHistory(), score]))
  }
}
export const onLocalStatus = (f: () => void) => { localListeners.add(f); return () => { localListeners.delete(f) } }
function saveLocal() {
  try { localStorage.setItem(localKey, JSON.stringify(clock.save())); localMessage = 'Saved on this device' }
  catch { localMessage = 'Device save failed' }
  localListeners.forEach(f => f())
}
clock.onSave(saveLocal)
if (!restored && localMessage === 'Saved on this device') saveLocal()
function switchPlayer(userId: string | null) {
  const nextKey = userId ? STORAGE_KEY + '.' + userId : STORAGE_KEY
  if (localKey === nextKey) return
  clock.setSpeed(0)
  const guestSave = localKey === STORAGE_KEY ? clock.save() : undefined
  localKey = nextKey
  let next: Save | undefined
  try {
    const raw = localStorage.getItem(nextKey)
    const data = raw && JSON.parse(raw)
    if (isSave(data)) next = data
  } catch { /* Browser storage can be unavailable. */ }
  clock.restore(next ?? guestSave ?? { version: 1, game: newGame(), elapsed: 0 })
}
if (document.hidden) clock.setSpeed(0)
document.addEventListener('visibilitychange', () => { if (document.hidden) clock.setSpeed(0) })
window.addEventListener('pagehide', () => clock.setSpeed(0))
window.addEventListener('beforeunload', () => clock.setSpeed(0))
const timer = window.setInterval(clock.tick, 125)
if (import.meta.hot) import.meta.hot.dispose(() => clearInterval(timer))

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
// Use the hosted game's public client settings as a pair when no override is set.
const useHostedProject = window.location.origin === 'https://bank-tycoon-ashen.vercel.app' && !configuredUrl && !configuredKey
const url = useHostedProject ? 'https://mddbtxwdueocbfgcapyt.supabase.co' : configuredUrl
const key = useHostedProject ? 'sb_publishable_miPQ5jW1aRk5SCs1tGe1uA_P9-S-SCx' : configuredKey
export const cloudConfigured = Boolean(url && key && !url.includes('your-project') && !key.includes('your-publishable'))
export function useAccount() {
  const [loading, setLoading] = useState(cloudConfigured)
  const [guest, setGuest] = useState(() => {
    try { return sessionStorage.getItem('banking-tycoon.guest') === 'yes' } catch { return false }
  })
  const [user, setUser] = useState<User | null>(null)
  const [sync, setSync] = useState<SyncState | null>(null)
  const client = useRef<SupabaseClient | null>(null)
  const service = useRef<CloudSync | null>(null)
  const [attempt, setAttempt] = useState(0)
  const readBoard = useCallback(async (): Promise<BankRank[]> => {
    if (!client.current) throw new Error('Connect Supabase to view shared scores.')
    const { data,error } = await client.current.rpc('get_year_end_leaderboard')
    if (error?.code === 'PGRST202') throw new Error('Shared rankings need the leaderboard migration in Supabase.')
    if (error) throw new Error(error.message)
    return data ?? []
  }, [])
  useEffect(() => {
    if (!cloudConfigured) return
    let stopped = false
    let unsubscribe: (() => void) | undefined
    let currentId: string | null = null
    void import('./cloud/client').then(({ createCloud, repository }) => {
      if (stopped) return
      const api = client.current ?? createCloud(url, key)
      client.current = api
      const { data } = api.auth.onAuthStateChange((_event, session) => {
        if (stopped) return
        const signedIn = session?.user ?? null
        setLoading(false)
        setUser(signedIn)
        if ((signedIn?.id ?? null) === currentId && _event !== 'SIGNED_OUT') return
        service.current?.close()
        service.current = null
        currentId = signedIn?.id ?? null
        switchPlayer(currentId)
        if (signedIn || _event === 'SIGNED_OUT') {
          setGuest(false)
          try { sessionStorage.removeItem('banking-tycoon.guest') } catch { /* Optional preference. */ }
        }
        setSync(null)
        if (signedIn) {
          const manager = new CloudSync(clock, repository(api, signedIn.id), setSync)
          service.current = manager
          window.setTimeout(() => { void manager.connect() }, 0)
        }
      })
      unsubscribe = () => data.subscription.unsubscribe()
    }).catch(e => { if (!stopped) { setLoading(false); setSync({ status: 'error', error: String(e) }) } })
    return () => { stopped = true; unsubscribe?.(); service.current?.close(); service.current = null }
  }, [attempt])
  return { user, sync, guest, loading, configured: cloudConfigured, readBoard,
    async postScore() {
      if (!client.current || !user) throw new Error('Log in to post a score.')
      const { error } = await client.current.rpc('post_year_end_score')
      if (error) throw new Error(error.message)
    },
    playGuest() {
      setGuest(true)
      try { sessionStorage.setItem('banking-tycoon.guest', 'yes') } catch { /* Optional preference. */ }
      if (freshGuest && !document.hidden) clock.setSpeed(1)
      freshGuest = false
    },
    retry: () => service.current ? void service.current.connect() : setAttempt(v => v + 1),
    choose: (source: 'local' | 'cloud') => service.current?.choose(source),
    async register(username: string, password: string, bankName: string) {
      if (!cloudConfigured) throw new Error('Connect Supabase to create a player account.')
      const { registerPlayer } = await import('./cloud/client')
      await registerPlayer(url, key, username, password, bankName)
    },
    async nameBank(input: string) {
      const name = cleanBankName(input)
      if (!name) throw new Error('Enter a name for your bank.')
      if (!client.current || !user) throw new Error('Log in to name your bank.')
      const { error } = await client.current.auth.updateUser({ data: { bank_name: name } })
      if (error) throw error
    },
    async login(username: string, password: string) {
      if (!client.current) throw new Error('Cloud connection unavailable. Check your project settings.')
      const { email } = playerIdentity(username)
      const { error } = await client.current.auth.signInWithPassword({ email, password })
      if (error?.code === 'invalid_credentials') throw new Error('Incorrect username or password.')
      if (error) throw error
    },
    async emailLink(email: string) {
      if (!client.current) throw new Error('Cloud connection unavailable. Check your project settings.')
      const { error } = await client.current.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })
      if (error) throw error
    },
    async signOut() {
      if (!client.current) return
      const { error } = await client.current.auth.signOut({ scope: 'local' })
      if (error) throw error
    },
  }
}
export type Account = ReturnType<typeof useAccount>
