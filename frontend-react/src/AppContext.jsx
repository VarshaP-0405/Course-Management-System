import { useEffect, useState } from 'react'
import { getCollection, request } from './api.js'
import { AppContext } from './app-context.js'

const collections = ['users', 'students', 'faculty', 'courses', 'course_faculty', 'modules', 'enrollments', 'progress', 'notifications', 'reviews']

async function loadCollections() {
  const data = await Promise.all(collections.map((name) => getCollection(name)))
  return Object.fromEntries(collections.map((name, index) => [name, data[index]]))
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('cms_session') || 'null')
  } catch {
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
      setRecords(await loadCollections())
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollections()
      .then(setRecords)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [])

  const signIn = async ({ email, password, role }) => {
    const user = await request('api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password, role }),
    })

    const nextSession = { userId: user.id, email: user.email, role: String(user.role) }
    localStorage.setItem('cms_session', JSON.stringify(nextSession))
    setSession(nextSession)
    return user
  }

  const signOut = () => {
    localStorage.removeItem('cms_session')
    setSession(null)
  }

  const registerStudent = async (form) => {
    const existingUsers = await getCollection('users')
    if (existingUsers.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) {
      throw new Error('An account with this email already exists.')
    }
    const user = await request('users', {
      method: 'POST',
      body: JSON.stringify({ email: form.email.trim(), password: form.password, role: 3 }),
    })
    const student = await request('students', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        department: form.department,
        blacklisted: 'N',
      }),
    })
    setRecords((current) => ({
      ...current,
      users: [...(current.users || existingUsers), user],
      students: [...(current.students || []), student],
    }))
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

  const user = records.users?.find((item) => String(item.id) === String(session?.userId)) || null
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