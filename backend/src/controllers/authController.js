import { listRecords } from '../services/databaseService.js'

export async function login(request, response, next) {
  try {
    const { email, password, role } = request.body || {}
    if (!email || !password || !role) {
      return response.status(400).json({ message: 'Email, password, and role are required.' })
    }

    const users = await listRecords('users')
    const user = users.find((record) => record.email?.trim().toLowerCase() === email.trim().toLowerCase()
      && String(record.role) === String(role)
      && record.password === password)

    if (!user) return response.status(401).json({ message: 'Email, password, or role is incorrect.' })

    const profileCollection = String(user.role) === '2' ? 'faculty' : String(user.role) === '3' ? 'students' : null
    if (profileCollection) {
      const profiles = await listRecords(profileCollection)
      const profile = profiles.find((record) => String(record.user_id) === String(user.id))
      if (profile?.blacklisted === 'Y' || profile?.blacklisted === true) {
        return response.status(403).json({ message: 'This account is disabled. Contact an administrator.' })
      }
    }

    return response.json({ id: user.id, email: user.email, role: user.role })
  } catch (error) {
    return next(error)
  }
}
