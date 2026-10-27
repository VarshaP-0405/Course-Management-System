import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { listRecords, registerStudentAccount } from '../services/databaseService.js'
import { validateLogin, validateRegistration } from '../services/validationService.js'

function publicUser(user) {
  const { password: _password, ...account } = user
  return account
}

export async function login(request, response, next) {
  try {
    const { email, password, role } = request.body || {}
    validateLogin(request.body)

    const users = await listRecords('users')
    const user = users.find((record) => record.email?.trim().toLowerCase() === email.trim().toLowerCase()
      && (role === undefined || String(record.role) === String(role))
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

    const account = publicUser(user)
    const token = jwt.sign(
      { email: account.email, role: String(account.role) },
      config.jwtSecret,
      { algorithm: 'HS256', subject: String(account.id), expiresIn: config.jwtExpiresIn },
    )
    return response.json({ ...account, token })
  } catch (error) {
    return next(error)
  }
}

export function getCurrentUser(request, response) {
  response.json({
    id: Number(request.user.id),
    email: request.user.email,
    role: Number(request.user.role),
  })
}

export async function register(request, response, next) {
  try {
    const values = validateRegistration(request.body)
    const result = await registerStudentAccount(values)
    return response.status(201).json({
      user: publicUser(result.user),
      student: result.student,
    })
  } catch (error) {
    return next(error)
  }
}
