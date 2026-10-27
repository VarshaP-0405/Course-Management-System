import { useEffect, useState } from 'react'
import { getCollection, request } from './api.js'
import { AppContext } from './app-context.js'

const publicCollections = ['courses', 'modules']
const collectionsByRole = {
  1: ['users', 'students', 'faculty', 'courses', 'course_faculty', 'modules', 'enrollments', 'progress', 'notifications', 'reviews'],
  2: ['students', 'faculty', 'courses', 'course_faculty', 'modules', 'enrollments', 'progress', 'notifications', 'reviews'],
  3: ['students', 'courses', 'modules', 'enrollments', 'progress', 'notifications', 'reviews'],
}

async function loadCollections(role) {
  const collections = collectionsByRole[role] || publicCollections
  const data = await Promise.all(collections.map((name) => getCollection(name)))
  return Object.fromEntries(collections.map((name, index) => [name, data[index]]))
}

function getStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem('cms_session') || 'null')
    return session?.token ? session : null
  } catch {
    localStorage.removeItem('cms_session')
    return null
  }
}

export function AppProvider({ children }) {
  const [records, setRecords] = useState({})
  const [session, setSession] = useState(getStoredSession)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    try {
      setRecords(await loadCollections(session?.role))
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const initialize = async () => {
      try {
        if (session?.token) {
          const account = await request('api/auth/me')
          if (!active) return
          const nextSession = {
            userId: account.id,
            email: account.email,
            role: String(account.role),
            token: session.token,
          }
          setSession(nextSession)
          localStorage.setItem('cms_session', JSON.stringify(nextSession))
          setRecords(await loadCollections(nextSession.role))
        } else {
          setRecords(await loadCollections(null))
        }
      } catch (loadError) {
        if (!active) return
        if (loadError.status === 401) {
          localStorage.removeItem('cms_session')
          setSession(null)
          setRecords(await loadCollections(null))
          setError('Your session has expired. Please sign in again.')
        } else {
          setError(loadError.message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()
    return () => { active = false }
  }, [session?.token])

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null)
      setRecords((current) => Object.fromEntries(
        publicCollections.map((collection) => [collection, current[collection] || []]),
      ))
      setError('Your session has expired. Please sign in again.')
    }
    window.addEventListener('cms:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('cms:unauthorized', handleUnauthorized)
  }, [])

  const signIn = async ({ email, password, role }) => {
    const user = await request('api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password, role }),
    })

    const nextSession = { userId: user.id, email: user.email, role: String(user.role), token: user.token }
    localStorage.setItem('cms_session', JSON.stringify(nextSession))
    setSession(nextSession)
    setRecords(await loadCollections(nextSession.role))
    return user
  }

  const signOut = () => {
    localStorage.removeItem('cms_session')
    setSession(null)
    setRecords((current) => Object.fromEntries(
      publicCollections.map((collection) => [collection, current[collection] || []]),
    ))
  }

  const registerStudent = async (form) => {
    const registration = await request('api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        email: form.email.trim(),
      }),
    })
    return registration
  }

  const enroll = async (courseId) => {
    const student = records.students?.find((item) => String(item.user_id) === String(session?.userId))
    if (!student) throw new Error('No student profile is linked to this account.')
    if (records.enrollments?.some((item) => String(item.student_id) === String(student.id) && String(item.course_id) === String(courseId))) {
      throw new Error('You are already enrolled in this course.')
    }
    const enrollment = await request('enrollments', {
      method: 'POST',
      body: JSON.stringify({ student_id: student.id, course_id: Number(courseId), status: 'Enrolled', enrollment_date: new Date().toISOString() }),
    })
    setRecords((current) => ({ ...current, enrollments: [...(current.enrollments || []), enrollment] }))
    return enrollment
  }

  const user = session
    ? { id: session.userId, email: session.email, role: Number(session.role) }
    : null
  const student = records.students?.find((item) => String(item.user_id) === String(session?.userId)) || null
  const value = {
    ...records,
    user,
    student,
    session,
    loading,
    error,
    refresh,
    signIn,
    signOut,
    registerStudent,
    enroll,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}