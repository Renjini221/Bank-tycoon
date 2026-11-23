export const usernamePattern = '[A-Za-z0-9_]{3,24}'
const usernameRegex = new RegExp('^' + usernamePattern + '$')
export const bankNameLimit = 48
export const defaultBankName = 'Kochi Bank'

export function cleanBankName(input: string) {
  const name = input.trim().replace(/\s+/g, ' ')
  if (name.length > bankNameLimit) throw new Error('Choose a bank name of 48 characters or fewer.')
  return name
}

export function playerIdentity(input: string) {
  const username = input.trim()
  if (!usernameRegex.test(username)) throw new Error('Use 3–24 letters, numbers or underscores for your username.')
  // Supabase's password provider expects an email-shaped identifier.
  // The reserved domain has no mailbox. Supabase enforces uniqueness atomically.
  return { username, email: username.toLowerCase() + '@players.banking-tycoon.invalid' }
}
