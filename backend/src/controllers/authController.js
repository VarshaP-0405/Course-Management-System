import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { findUserByEmail, listRecords, registerStudentAccount } from '../services/databaseService.js'
import { validateLogin, validateRegistration } from '../services/validationService.js'

function publicUser(user) {
  const { password: _password, ...account } = user
  return account
}

export async function login(request, response, next) {
  try {
    const { email, password, role } = request.body || {}
    validateLogin(request.body)

    const user = await findUserByEmail(email)

    const isBcryptHash = user && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password)
    const passwordMatches = user && isBcryptHash && await bcrypt.compare(password, user.password)
      && (role === undefined || String(user.role) === String(role))
    if (!user || !passwordMatches) {
      return response.status(401).json({ message: 'Email, password, or role is incorrect.' })
    }

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
    return response.json({
      ...account,
      message: 'Login successful.',
      token,
      tokenType: 'Bearer',
      expiresIn: config.jwtExpiresIn,
    })
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
      message: 'Student registered successfully.',
      user: publicUser(result.user),
      student: result.student,
    })
  } catch (error) {
    return next(error)
  }
}
