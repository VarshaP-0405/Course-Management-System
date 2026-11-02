import { createRecord, findUserByEmail } from './databaseService.js'

export async function ensureAdminAccount({ email, password }) {
  if (!password) return false
  if (password.length < 16 || password.length > 72 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must be 16-72 characters and no more than 72 UTF-8 bytes.')
  }

  const existing = await findUserByEmail(email)
  if (existing) {
    if (String(existing.role) !== '1') {
      throw new Error(`ADMIN_EMAIL "${email}" is already assigned to a non-admin account.`)
    }
    return false
  }

  await createRecord('users', {
    email,
    password,
    role: 1,
    created_at: new Date().toISOString(),
  })
  return true
}
