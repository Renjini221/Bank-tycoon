import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Repository, Row } from './sync'
import { cleanBankName, playerIdentity } from './players'

export function createCloud(url: string, key: string) { return createClient(url, key) }
export async function registerPlayer(url: string, key: string, name: string, password: string, bankName: string) {
  const { username, email } = playerIdentity(name)
  const bank = cleanBankName(bankName)
  const settings = await fetch(url.replace(/\/$/, '') + '/auth/v1/settings', { headers: { apikey: key } })
  if (!settings.ok) throw new Error('Could not read the project’s authentication settings. Try again.')
  const config = await settings.json()
  if (config.disable_signup || !config.external?.email) throw new Error('The project has disabled password registration.')
  if (!config.mailer_autoconfirm) throw new Error('Username registration needs Confirm email turned off in this game’s Supabase project.')
  // Registration returns a session when confirmation is off. Keep it separate
  // from the player's persistent session until they explicitly log in.
  const registration = createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
    storageKey: 'banking-tycoon-registration',
  } })
  const metadata = bank ? { username, bank_name: bank } : { username }
  const { data, error } = await registration.auth.signUp({ email, password, options: { data: metadata } })
  if (error?.code === 'user_already_exists' || error?.code === 'email_exists') throw new Error('That username is taken. Choose another or log in.')
  if (error) throw error
  if (!data.session) throw new Error('Registration could not finish. Check the project’s confirmation settings.')
  await registration.auth.signOut({ scope: 'local' })
}
export function repository(client: SupabaseClient, userId: string): Repository {
  const table = () => client.from('bank_saves')
  return {
    async read() {
      const { data, error } = await table().select('state,revision').eq('user_id', userId).maybeSingle()
      if (error) throw new Error(error.message)
      return data as Row | null
    },
    async write(state, revision) {
      const values = { state, revision: revision + 1 }
      const query = revision === 0 ? table().insert({ ...values, user_id: userId })
        : table().update(values).eq('user_id', userId).eq('revision', revision)
      const { data, error } = await query.select('revision').maybeSingle()
      if (error?.code === '23505') return null
      if (error) throw new Error(error.message)
      return data?.revision ?? null
    },
  }
}
