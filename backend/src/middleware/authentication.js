import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

export function authenticate(request, response, next) {
  const authorization = request.get('authorization')
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!match) {
    return response.status(401).json({ message: 'A valid Bearer token is required.' })
  }

  try {
    const claims = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'] })
    if (!claims.sub || !['1', '2', '3'].includes(String(claims.role))) {
      return response.status(401).json({ message: 'The authentication token is invalid.' })
    }

    request.user = {
      id: String(claims.sub),
      email: claims.email,
      role: String(claims.role),
    }
    return next()
  } catch {
    return response.status(401).json({ message: 'The authentication token is invalid or expired.' })
  }
}

export function authorizeCollection(request, response, next) {
  const { collection } = request.params
  const { role } = request.user
  const isRead = request.method === 'GET'

  if (collection === 'users' && role !== '1') {
    return response.status(403).json({ message: 'Administrator access is required for user records.' })
  }

  if (isRead) {
    if (role === '1' || role === '2') return next()
    if (role === '3' && ['students', 'enrollments', 'progress', 'module_completions', 'notifications', 'reviews'].includes(collection)) {
      return next()
    }
    return response.status(403).json({ message: 'Your role cannot access this collection.' })
  }

  if (role === '1') return next()
  if (role === '2' && collection === 'modules') return next()
  if (role === '3' && request.method === 'POST' && collection === 'enrollments') return next()

  return response.status(403).json({ message: 'Your role cannot modify this collection.' })
}
