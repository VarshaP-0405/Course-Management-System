import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const databaseCollections = [
  'users', 'students', 'faculty', 'courses', 'course_faculty',
  'modules', 'enrollments', 'progress', 'notifications', 'reviews',
]

const databaseTemplates = {
  users: { email: '', role: 3, password: '' },
  students: { user_id: null, first_name: '', last_name: '', department: '' },
  faculty: { user_id: null, first_name: '', last_name: '', department: '', qualification: '', specialization: '', employee_id: '' },
  courses: { course_name: '', course_code: '', instructor: '', duration: '', credits: 0, category: '', description: '' },
  course_faculty: { course_id: null, faculty_id: null },
  modules: { course_id: null, title: '', description: '', module_number: 1, video_link: '', notes: '' },
  enrollments: { student_id: null, course_id: null, status: 'Enrolled' },
  progress: { student_id: null, course_id: null, completed_modules: 0, total_modules: 0, progress_percentage: 0 },
  notifications: { student_id: null, title: '', message: '', is_read: false },
  reviews: { student_id: null, course_id: null, rating: 5, review: '' },
}

const roleDestinations = {
  1: '/admin/dashboard',
  2: '/faculty/dashboard',
  3: '/student/dashboard',
}

function getStoredSession() {
  try {
    const session = localStorage.getItem('cms_session')
    return session ? JSON.parse(session) : null
  } catch (error) {
    console.error('Invalid cms_session value', error)
    return null
  }
}

function useCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/courses`, {
          headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
          throw new Error('Failed to load courses')
        }

        const data = await response.json()
        setCourses(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Could not load courses from backend.', error)
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  return { courses, loading }
}

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Courses', to: '/browse-courses' },
  { label: 'Login', to: '/login' },
  { label: 'Register', to: '/register' },
]

const adminNavItems = [
  { label: 'Admin Dashboard', to: '/admin/dashboard' },
  { label: 'Database', to: '/admin/database' },
  { label: 'Students', to: '/students' },
  { label: 'Add Faculty', to: '/add-faculty' },
  { label: 'Add Course', to: '/add-course' },
  { label: 'Reports', to: '/reports' },
]

const facultyNavItems = [
  { label: 'Faculty Dashboard', to: '/faculty/dashboard' },
  { label: 'Courses', to: '/browse-courses' },
]

const studentNavItems = [
  { label: 'Student Dashboard', to: '/student/dashboard' },
  { label: 'Courses', to: '/browse-courses' },
  { label: 'My Courses', to: '/my-courses' },
  { label: 'Progress', to: '/progress' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Profile', to: '/profile' },
]

function PageShell({ title, subtitle, children }) {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Course Management</p>
          <h1>{title}</h1>
        </div>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

function Header() {
  const navigate = useNavigate()
  const session = getStoredSession()
  const role = String(session?.role || '')
  const items = role === '1'
    ? adminNavItems
    : role === '2'
      ? facultyNavItems
      : role === '3'
        ? studentNavItems
        : navItems

  const handleLogout = () => {
    localStorage.removeItem('cms_session')
    navigate('/login')
  }

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" to="/">
          CourseHub
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
          {session?.role ? (
            <button className="nav-link nav-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  )
}

function RoleRoute({ allowedRoles, children }) {
  const session = getStoredSession()
  const navigate = useNavigate()
  const role = String(session?.role || '')

  useEffect(() => {
    if (!allowedRoles.includes(role)) {
      navigate(session?.role ? roleDestinations[Number(role)] || '/' : '/login', { replace: true })
    }
  }, [allowedRoles, navigate, role, session?.role])

  return allowedRoles.includes(role) ? children : null
}

function Footer() {
  const session = getStoredSession()

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p>© 2026 CourseHub Learning Platform</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {String(session?.role) === '1' ? <Link to="/reports">Reports</Link> : null}
        </div>
      </div>
    </footer>
  )
}

function HomePage() {
  return (
    <PageShell title="Learn with clarity. Manage with confidence." subtitle="A modern course management system for students, faculty, and administrators.">
      <section className="hero-card">
        <div>
          <p className="eyebrow accent">Student-first platform</p>
          <h2>Everything your learning ecosystem needs.</h2>
          <p>
            Track enrollments, browse courses, review progress, and manage academic workflows from a single dashboard.
          </p>
          <div className="cta-row">
            <Link className="btn primary" to="/browse-courses">Explore Courses</Link>
            <Link className="btn secondary" to="/login">Sign In</Link>
          </div>
        </div>
        <div className="hero-stat-grid">
          <div className="stat-box">
            <strong>12K+</strong>
            <span>Active learners</span>
          </div>
          <div className="stat-box">
            <strong>140+</strong>
            <span>Courses</span>
          </div>
          <div className="stat-box">
            <strong>96%</strong>
            <span>Completion rate</span>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Student Portal</h3>
          <p>Enroll in courses, follow learning progress, and access certificates.</p>
        </div>
        <div className="feature-card">
          <h3>Faculty Dashboard</h3>
          <p>View assigned courses, monitor students, and manage academic delivery.</p>
        </div>
        <div className="feature-card">
          <h3>Admin Controls</h3>
          <p>Manage users, course inventory, and institutional reports from one place.</p>
        </div>
      </section>
    </PageShell>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', role: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    const session = getStoredSession()
    if (session?.role) {
      navigate(roleDestinations[Number(session.role)] || '/', { replace: true })
    }
  }, [navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem(
        'cms_session',
        JSON.stringify({
          email: data.email,
          role: String(data.role),
        }),
      )

      navigate(roleDestinations[data.role] || '/')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <PageShell title="Welcome back" subtitle="Login as Admin, Faculty or Student.">
      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Role
          <select name="role" value={form.role} onChange={handleChange} required>
            <option value="" disabled>Select Role</option>
            <option value="1">Admin</option>
            <option value="2">Faculty</option>
            <option value="3">Student</option>
          </select>
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email Address" required />
        </label>
        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" required />
        </label>
        {message ? <p className="form-message error">{message}</p> : null}
        <button className="btn primary full" type="submit">Login</button>
        <div className="form-links">
          <Link to="/forgot-password">Forgot Password?</Link>
          <Link to="/register">Create Account</Link>
        </div>
      </form>
    </PageShell>
  )
}

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    department: '',
  })
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      setMessage('Registration successful. Redirecting to login...')
      setTimeout(() => navigate('/login'), 800)
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <PageShell title="Create your account" subtitle="Join a learning community built for growth.">
      <form className="form-card two-col" onSubmit={handleSubmit}>
        <label>
          First name
          <input type="text" name="first_name" value={form.first_name} onChange={handleChange} placeholder="First name" required />
        </label>
        <label>
          Last name
          <input type="text" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name" required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" required />
        </label>
        <label>
          Phone
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
        </label>
        <label>
          Department
          <input type="text" name="department" value={form.department} onChange={handleChange} placeholder="Department" />
        </label>
        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" required />
        </label>
        <label>
          Confirm password
          <input type="password" name="confirm_password" value={form.confirm_password} onChange={handleChange} placeholder="Confirm password" required />
        </label>
        {message ? <p className="form-message success">{message}</p> : null}
        <button className="btn primary full" type="submit">Register</button>
      </form>
    </PageShell>
  )
}

function ForgotPasswordPage() {
  return (
    <PageShell title="Reset password" subtitle="Enter your email and we will help you recover access.">
      <form className="form-card">
        <label>
          Email address
          <input type="email" placeholder="name@example.com" />
        </label>
        <button className="btn primary full" type="submit">Send reset link</button>
      </form>
    </PageShell>
  )
}

function ResetPasswordPage() {
  return (
    <PageShell title="Choose a new password" subtitle="Create a new secure password for your account.">
      <form className="form-card">
        <label>
          New password
          <input type="password" placeholder="New password" />
        </label>
        <label>
          Confirm password
          <input type="password" placeholder="Confirm password" />
        </label>
        <button className="btn primary full" type="submit">Update password</button>
      </form>
    </PageShell>
  )
}

function BrowseCoursesPage() {
  const { courses, loading } = useCourses()
  const session = getStoredSession()
  const isStudent = String(session?.role) === '3'

  return (
    <PageShell title="Available Courses" subtitle="Explore the programs and resources you can join.">
      {loading ? <p>Loading courses...</p> : null}
      <div className="card-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <span className="badge">{course.category || 'General'}</span>
            <h3>{course.course_name || course.cname}</h3>
            <p>{course.course_code}</p>
            <p>{course.description}</p>
            <ul>
              <li>Instructor: {course.instructor}</li>
              <li>Duration: {course.duration}</li>
              <li>Credits: {course.credits}</li>
            </ul>
            <div className="card-actions">
              <Link className="btn secondary" to={`/courses/${course.id}`}>
                View Details
              </Link>
              {isStudent ? (
                <EnrollButton courseId={course.id} />
              ) : (
                <Link className="btn secondary" to="/login">
                  Login to Enroll
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

function EnrollButton({ courseId }) {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  const enroll = async () => {
    setEnrolling(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/api/enroll/${courseId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Enrollment failed')
      navigate('/student/dashboard')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div>
      <button className="btn primary" type="button" onClick={enroll} disabled={enrolling}>
        {enrolling ? 'Enrolling...' : 'Enroll'}
      </button>
      {message ? <p className="form-message error">{message}</p> : null}
    </div>
  )
}

function CourseDetailsPage() {
  const { courses, loading } = useCourses()
  const { id } = useParams()
  const course = courses.find((item) => item.id === Number(id))
  const session = getStoredSession()
  const isStudent = String(session?.role) === '3'

  if (loading) {
    return <PageShell title="Loading course" subtitle="Fetching course details..." />
  }

  if (!course) {
    return <PageShell title="Course not found" subtitle="The selected course does not exist." />
  }

  return (
    <PageShell title={course.course_name} subtitle={course.course_code}>
      <div className="detail-card">
        <p className="eyebrow">{course.category}</p>
        <p>{course.description}</p>
        <div className="detail-meta">
          <span>Instructor: {course.instructor}</span>
          <span>Duration: {course.duration}</span>
          <span>Credits: {course.credits}</span>
        </div>
        <div className="cta-row">
          {isStudent ? (
            <EnrollButton courseId={course.id} />
          ) : (
            <Link className="btn secondary" to="/login">Login to Enroll</Link>
          )}
          <Link className="btn secondary" to="/browse-courses">Back to courses</Link>
        </div>
      </div>
    </PageShell>
  )
}

function CourseContentPage() {
  const { id } = useParams()
  const [content, setContent] = useState({ course: null, modules: [] })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/courses/${id}/content`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Unable to load course content')
        }
        setContent(data)
      } catch (error) {
        setMessage(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [id])

  if (loading) {
    return <PageShell title="Course content" subtitle="Loading your learning materials..." />
  }

  if (message || !content.course) {
    return <PageShell title="Course content unavailable" subtitle={message || 'The selected course could not be found.'} />
  }

  return (
    <PageShell title={content.course.course_name} subtitle={`${content.course.course_code} · ${content.course.instructor}`}>
      <div className="detail-card">
        <p>{content.course.description}</p>
        <div className="detail-meta">
          <span>Duration: {content.course.duration || 'Self-paced'}</span>
          <span>Credits: {content.course.credits || 0}</span>
          <span>{content.modules.length} modules</span>
        </div>
      </div>

      <div className="card-grid">
        {content.modules.map((module, index) => (
          <article key={module.id} className="course-card">
            <span className="badge">Module {index + 1}</span>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            <div className="detail-card compact-detail-card">
              <strong>Notes</strong>
              <p>{module.notes}</p>
            </div>
            <div className="card-actions">
              {module.video_link ? (
                <a className="btn primary" href={module.video_link} target="_blank" rel="noreferrer">
                  Watch video
                </a>
              ) : null}
              <span className="badge">{module.duration}</span>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  )
}

function StudentDashboardPage() {
  const [summary, setSummary] = useState({ enrolled_count: 0, total_courses: 0, student_courses: [] })
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/student/dashboard`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Failed to load student dashboard')
        }
        const data = await response.json()
        setSummary(data)
      } catch (error) {
        console.error('Student dashboard fetch failed', error)
      }
    }

    loadSummary()
    fetch(`${API_BASE}/api/student/notifications`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Failed to load notifications')))
      .then(setNotifications)
      .catch((error) => console.error('Student notifications fetch failed', error))
  }, [])

  const activeCourses = summary.student_courses
  const averageProgress = activeCourses.length
    ? Math.round(activeCourses.reduce((total, course) => total + (course.progress || 0), 0) / activeCourses.length)
    : 0

  return (
    <PageShell title="Student Dashboard" subtitle="Here is your current learning overview.">
      <div className="dashboard-panel">
        <div className="stats-grid">
          <div className="stat-tile">
            <strong>{summary.enrolled_count}</strong>
            <span>Enrolled courses</span>
          </div>
          <div className="stat-tile">
            <strong>{activeCourses.length}</strong>
            <span>Active courses</span>
          </div>
          <div className="stat-tile">
            <strong>{averageProgress}%</strong>
            <span>Average progress</span>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="section-head">
          <h3>My Courses</h3>
          <Link className="btn secondary small" to="/browse-courses">Browse all</Link>
        </div>

        <div className="card-grid">
          {activeCourses.length ? activeCourses.map((course) => (
            <div key={course.id || `${course.course_name}-${course.progress}`} className="course-card dashboard-card">
              <span className="badge">{course.category || 'Learning path'}</span>
              <h3>{course.course_name || course.cname}</h3>
              <p>{course.instructor || 'Course access available'}</p>
              <div className="progress-line">
                <span style={{ width: `${course.progress || 0}%` }} />
              </div>
              <div className="card-actions">
                <Link className="btn secondary" to={`/courses/${course.id}/content`}>Continue</Link>
                <Link className="btn primary" to="/progress">Progress</Link>
              </div>
            </div>
          )) : <div className="empty-state">You are not enrolled in any courses yet. Browse the course catalog to get started.</div>}
        </div>
      </div>

      <div className="panel-card">
        <div className="section-head">
          <h3>Notifications</h3>
          <Link className="btn secondary small" to="/notifications">View all</Link>
        </div>

        <div className="notification-list dashboard-list">
          {notifications.length ? notifications.slice(0, 3).map((item) => (
            <div key={item.id} className="notification-item">
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <span>{item.is_read ? 'Read' : 'New'}</span>
            </div>
          )) : <div className="empty-state">No notifications available.</div>}
        </div>
      </div>
    </PageShell>
  )
}

function FacultyDashboardPage() {
  const [dashboard, setDashboard] = useState({
    student_count: 0,
    course_count: 0,
    completion: 0,
    faculty: {},
    assigned_courses: [],
  })
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', notes: '', video_link: '', video: null, course_id: '' })
  const [moduleMessage, setModuleMessage] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/faculty/dashboard`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Failed to load faculty dashboard')
        }
        setDashboard(await response.json())
      } catch (error) {
        console.error('Faculty dashboard fetch failed', error)
      }
    }

    loadDashboard()
  }, [])

  const handleModuleChange = (event) => {
    const { name, value } = event.target
    setModuleForm((current) => ({ ...current, [name]: name === 'video' ? event.target.files[0] : value }))
  }

  const handleModuleSubmit = async (event) => {
    event.preventDefault()
    setModuleMessage('')
    try {
      const formData = new FormData()
      Object.entries(moduleForm).forEach(([name, value]) => {
        if (value) formData.append(name, value)
      })
      const response = await fetch(`${API_BASE}/api/faculty/courses/${moduleForm.course_id}/modules`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save course content')
      setModuleMessage('Module notes and video saved successfully.')
      setModuleForm({ title: '', description: '', notes: '', video_link: '', video: null, course_id: moduleForm.course_id })
    } catch (error) {
      setModuleMessage(error.message)
    }
  }

  return (
    <PageShell title="Faculty Dashboard" subtitle="Monitor assigned classes and student activity.">
      <div className="dashboard-panel">
        <div className="stats-grid">
          <div className="stat-tile">
            <strong>{dashboard.student_count}</strong>
            <span>Students</span>
          </div>
          <div className="stat-tile">
            <strong>{dashboard.course_count}</strong>
            <span>Assigned courses</span>
          </div>
          <div className="stat-tile">
            <strong>{dashboard.completion}%</strong>
            <span>Course completion</span>
          </div>
        </div>
      </div>

      <div className="panel-card profile-panel">
        <div className="section-head">
          <h3>Faculty Profile</h3>
        </div>
        <div className="faculty-profile-grid">
          <div>
            <p className="profile-label">Name</p>
            <h4>{dashboard.faculty.name || 'Faculty profile unavailable'}</h4>
          </div>
          <div>
            <p className="profile-label">Employee ID</p>
            <h4>{dashboard.faculty.employee_id || 'Not assigned'}</h4>
          </div>
          <div>
            <p className="profile-label">Department</p>
            <h4>{dashboard.faculty.department || 'Not assigned'}</h4>
          </div>
          <div>
            <p className="profile-label">Qualification</p>
            <h4>{dashboard.faculty.qualification || 'Not assigned'}</h4>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="section-head">
          <h3>Assigned Courses</h3>
        </div>
        <div className="table-card compact-table">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Department</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.assigned_courses.length ? dashboard.assigned_courses.map((course) => (
                <tr key={course.id}>
                  <td>{course.course_name}</td>
                  <td>{course.department}</td>
                  <td>{course.students}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="empty-state">No courses are assigned to this faculty account yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-card">
        <div className="section-head">
          <h3>Add Course Content</h3>
        </div>
        {dashboard.assigned_courses.length ? (
          <form className="form-card two-col" onSubmit={handleModuleSubmit}>
            <label>
              Course
              <select name="course_id" value={moduleForm.course_id} onChange={handleModuleChange} required>
                <option value="" disabled>Select assigned course</option>
                {dashboard.assigned_courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>)}
              </select>
            </label>
            <label>
              Module title
              <input name="title" value={moduleForm.title} onChange={handleModuleChange} placeholder="Module title" required />
            </label>
            <label className="full-width">
              Description
              <textarea name="description" value={moduleForm.description} onChange={handleModuleChange} rows="3" placeholder="What will students learn?" />
            </label>
            <label className="full-width">
              Notes
              <textarea name="notes" value={moduleForm.notes} onChange={handleModuleChange} rows="3" placeholder="Study notes for students" />
            </label>
            <label className="full-width">
              Video URL
              <input type="url" name="video_link" value={moduleForm.video_link} onChange={handleModuleChange} placeholder="https://..." />
            </label>
            <label className="full-width">
              Upload video
              <input type="file" name="video" accept="video/mp4,video/webm,video/quicktime,video/ogg" onChange={handleModuleChange} />
            </label>
            {moduleMessage ? <p className="form-message success full-width">{moduleMessage}</p> : null}
            <button className="btn primary full" type="submit">Publish Content</button>
          </form>
        ) : <p className="empty-state">You need an assigned course before you can publish notes or videos.</p>}
      </div>
    </PageShell>
  )
}

function AdminDashboardPage() {
  const [summary, setSummary] = useState({ total_students: 0, total_faculty: 0, total_courses: 0, total_enrollments: 0 })

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/admin/summary`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Failed to load admin summary')
        }
        const data = await response.json()
        setSummary(data)
      } catch (error) {
        console.error('Admin summary fetch failed', error)
      }
    }

    loadSummary()
  }, [])

  const quickActions = [
    { label: 'Database', to: '/admin/database', description: 'View and manage live records' },
    { label: 'Student List', to: '/students', description: 'Manage all learners' },
    { label: 'Add Faculty', to: '/add-faculty', description: 'Create faculty profiles' },
    { label: 'Add Course', to: '/add-course', description: 'Create new programs' },
    { label: 'Reports', to: '/reports', description: 'Review institutional data' },
  ]

  return (
    <PageShell title="Admin Dashboard" subtitle="Manage people, courses, and institutional performance.">
      <div className="dashboard-panel">
        <div className="stats-grid">
          <div className="stat-tile">
            <strong>{summary.total_students}</strong>
            <span>Students</span>
          </div>
          <div className="stat-tile">
            <strong>{summary.total_faculty}</strong>
            <span>Faculty</span>
          </div>
          <div className="stat-tile">
            <strong>{summary.total_courses}</strong>
            <span>Courses</span>
          </div>
          <div className="stat-tile">
            <strong>{summary.total_enrollments}</strong>
            <span>Enrollments</span>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="section-head">
          <h3>Quick Actions</h3>
        </div>
        <div className="card-grid compact-grid">
          {quickActions.map((action) => (
            <Link key={action.label} className="mini-card" to={action.to}>
              <div>
                <div>{action.label}</div>
                <small>{action.description}</small>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

function AddFacultyPage() {
  const session = getStoredSession()
  const isAdmin = session?.role === '1'
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '', department: '', qualification: '', specialization: '', employee_id: '' })
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/api/admin/faculty`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to create faculty account')
      setMessage('Faculty account created successfully.')
      setForm({ first_name: '', last_name: '', email: '', password: '', phone: '', department: '', qualification: '', specialization: '', employee_id: '' })
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <PageShell title="Add Faculty" subtitle="Create a faculty member profile for the platform.">
      {!isAdmin ? (
        <div className="panel-card">
          <p className="form-message error">Admin access is required to add faculty members.</p>
          <div className="cta-row">
            <Link className="btn primary" to="/login">Login as admin</Link>
          </div>
        </div>
      ) : (
        <form className="form-card two-col panel-card" onSubmit={handleSubmit}>
          <label>
            First name
            <input name="first_name" value={form.first_name} onChange={handleChange} type="text" placeholder="First name" required />
          </label>
          <label>
            Last name
            <input name="last_name" value={form.last_name} onChange={handleChange} type="text" placeholder="Last name" required />
          </label>
          <label>
            Email
            <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="Phone" />
          </label>
          <label>
            Department
            <input name="department" value={form.department} onChange={handleChange} type="text" placeholder="Department" required />
          </label>
          <label>
            Qualification
            <input name="qualification" value={form.qualification} onChange={handleChange} type="text" placeholder="Qualification" required />
          </label>
          <label>
            Specialization
            <input name="specialization" value={form.specialization} onChange={handleChange} type="text" placeholder="Specialization" required />
          </label>
          <label>
            Employee ID
            <input name="employee_id" value={form.employee_id} onChange={handleChange} type="text" placeholder="Employee ID" required />
          </label>
          <label>
            Temporary password
            <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Password" required />
          </label>
          {message ? <p className="form-message success full-width">{message}</p> : null}
          <button className="btn primary full" type="submit">Save Faculty</button>
        </form>
      )}
    </PageShell>
  )
}

function StudentsPage() {
  const [studentsList, setStudentsList] = useState([])
  const [facultyList, setFacultyList] = useState([])
  const [message, setMessage] = useState('')

  const fetchPeople = async () => {
    const [studentsResponse, facultyResponse] = await Promise.all([
      fetch(`${API_BASE}/api/admin/students`, { credentials: 'include' }),
      fetch(`${API_BASE}/api/admin/faculty`, { credentials: 'include' }),
    ])
    if (!studentsResponse.ok || !facultyResponse.ok) throw new Error('Unable to load people')
    return Promise.all([studentsResponse.json(), facultyResponse.json()])
  }

  useEffect(() => {
    let active = true
    fetchPeople()
      .then(([loadedStudents, loadedFaculty]) => {
        if (active) {
          setStudentsList(loadedStudents)
          setFacultyList(loadedFaculty)
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message)
      })
    return () => { active = false }
  }, [])

  const updateStatus = async (type, id, blacklisted) => {
    const response = await fetch(`${API_BASE}/api/admin/${type}/${id}/blacklist`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blacklisted }),
    })
    if (!response.ok) throw new Error('Unable to update account status')
    const [loadedStudents, loadedFaculty] = await fetchPeople()
    setStudentsList(loadedStudents)
    setFacultyList(loadedFaculty)
  }

  const removePerson = async (type, id) => {
    if (!window.confirm('Remove this account permanently?')) return
    const response = await fetch(`${API_BASE}/api/admin/${type}/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!response.ok) throw new Error('Unable to remove account')
    const [loadedStudents, loadedFaculty] = await fetchPeople()
    setStudentsList(loadedStudents)
    setFacultyList(loadedFaculty)
  }

  const runAction = (action) => action().catch((error) => setMessage(error.message))

  return (
    <PageShell title="People Management" subtitle="Manage student and faculty accounts.">
      {message ? <p className="form-message error">{message}</p> : null}
      <div className="panel-card">
        <div className="section-head"><h3>Students</h3></div>
        <div className="table-card compact-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentsList.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td><td>{student.email}</td>
                  <td>{student.department}</td>
                  <td>{student.status}</td>
                  <td><button className="btn secondary small" type="button" onClick={() => runAction(() => updateStatus('students', student.id, !student.blacklisted))}>{student.blacklisted ? 'Restore' : 'Blacklist'}</button> <button className="btn secondary small" type="button" onClick={() => runAction(() => removePerson('students', student.id))}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel-card">
        <div className="section-head"><h3>Faculty</h3><Link className="btn primary small" to="/add-faculty">Add Faculty</Link></div>
        <div className="table-card compact-table">
          <table><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{facultyList.map((faculty) => <tr key={faculty.id}><td>{faculty.name}</td><td>{faculty.email}</td><td>{faculty.department}</td><td>{faculty.status}</td><td><button className="btn secondary small" type="button" onClick={() => runAction(() => updateStatus('faculty', faculty.id, !faculty.blacklisted))}>{faculty.blacklisted ? 'Restore' : 'Blacklist'}</button> <button className="btn secondary small" type="button" onClick={() => runAction(() => removePerson('faculty', faculty.id))}>Remove</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}

function AddCoursePage() {
  const session = getStoredSession()
  const isAdmin = session?.role === '1'
  const [facultyList, setFacultyList] = useState([])
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ course_name: '', course_code: '', instructor: '', duration: '', credits: '', category: '', faculty_id: '', description: '' })

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/faculty`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load faculty list')))
      .then(setFacultyList)
      .catch((error) => setMessage(error.message))
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/api/admin/courses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to create course')
      setMessage('Course created and faculty assignment saved.')
      setForm({ course_name: '', course_code: '', instructor: '', duration: '', credits: '', category: '', faculty_id: '', description: '' })
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <PageShell title="Add Course" subtitle="Create a new course and assign it to a faculty member.">
      {!isAdmin ? (
        <div className="panel-card">
          <p className="form-message error">Admin access is required to add new courses.</p>
          <div className="cta-row">
            <Link className="btn primary" to="/login">Login as admin</Link>
          </div>
        </div>
      ) : (
        <form className="form-card two-col panel-card" onSubmit={handleSubmit}>
          <label>
            Course name
            <input name="course_name" value={form.course_name} onChange={handleChange} type="text" placeholder="Course name" required />
          </label>
          <label>
            Course code
            <input name="course_code" value={form.course_code} onChange={handleChange} type="text" placeholder="Course code" required />
          </label>
          <label>
            Instructor
            <input name="instructor" value={form.instructor} onChange={handleChange} type="text" placeholder="Instructor" required />
          </label>
          <label>
            Duration
            <input name="duration" value={form.duration} onChange={handleChange} type="text" placeholder="e.g. 6 Weeks" required />
          </label>
          <label>
            Credits
            <input name="credits" value={form.credits} onChange={handleChange} type="number" placeholder="Credits" />
          </label>
          <label>
            Faculty
            <select name="faculty_id" value={form.faculty_id} onChange={handleChange}>
              <option value="" disabled>Select faculty</option>
              {facultyList.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <input name="category" value={form.category} onChange={handleChange} type="text" placeholder="Category" />
          </label>
          <label className="full-width">
            Description
            <textarea name="description" value={form.description} onChange={handleChange} rows="4" placeholder="Describe the course" />
          </label>
          {message ? <p className="form-message success full-width">{message}</p> : null}
          <button className="btn primary full" type="submit">Save course</button>
        </form>
      )}
    </PageShell>
  )
}

function EditCoursePage() {
  const { courses } = useCourses()
  const { id } = useParams()
  const course = courses.find((item) => item.id === Number(id))

  if (!course) {
    return <PageShell title="Course not found" subtitle="The selected course could not be found." />
  }

  return (
    <PageShell title={`Edit ${course.course_name || course.cname}`} subtitle="Update information for this course.">
      <form className="form-card two-col">
        <label>
          Course name
          <input type="text" defaultValue={course.course_name || course.cname} />
        </label>
        <label>
          Course code
          <input type="text" defaultValue={course.course_code} />
        </label>
        <label>
          Instructor
          <input type="text" defaultValue={course.instructor} />
        </label>
        <label>
          Duration
          <input type="text" defaultValue={course.duration} />
        </label>
        <label>
          Credits
          <input type="number" defaultValue={course.credits} />
        </label>
        <label>
          Category
          <input type="text" defaultValue={course.category || 'General'} />
        </label>
        <label className="full-width">
          Description
          <textarea rows="4" defaultValue={course.description} />
        </label>
        <button className="btn primary full" type="submit">Update course</button>
      </form>
    </PageShell>
  )
}

function MyCoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/student/dashboard`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load your courses')))
      .then((data) => setCourses(data.student_courses || []))
      .catch((error) => console.error('My courses fetch failed', error))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageShell title="My Courses" subtitle="Your active course enrollments.">
      {loading ? <p>Loading your courses...</p> : null}
      <div className="card-grid">
        {!loading && courses.length === 0 ? <div className="empty-state">You have not registered for any courses yet.</div> : null}
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <h3>{course.course_name}</h3>
            <p>{course.instructor}</p>
            <div className="progress-line">
              <span style={{ width: `${course.progress || 0}%` }} />
            </div>
            <Link className="btn primary" to={`/courses/${course.id}/content`}>Continue</Link>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/student/notifications`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load notifications')))
      .then(setNotifications)
      .catch((error) => console.error('Notifications fetch failed', error))
  }, [])

  return (
    <PageShell title="Notifications" subtitle="Recent updates from your courses and instructors.">
      <div className="notification-list">
        {notifications.length ? notifications.map((item) => (
          <div key={item.id} className="notification-item">
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <span>{item.is_read ? 'Read' : 'New'}</span>
          </div>
        )) : <div className="empty-state">No notifications available.</div>}
      </div>
    </PageShell>
  )
}

function ProgressPage() {
  const [courses, setCourses] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/student/dashboard`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load progress')))
      .then((data) => setCourses(data.student_courses || []))
      .catch((error) => console.error('Progress fetch failed', error))
  }, [])

  return (
    <PageShell title="Progress" subtitle="See how far you have advanced across your enrolled programs.">
      <div className="progress-list">
        {courses.map((course) => {
          const value = course.progress || 0
          return (
            <div key={course.id} className="progress-row">
              <div>
                <h3>{course.course_name}</h3>
                <p>{course.instructor}</p>
              </div>
              <div className="progress-meta">
                <div className="progress-line">
                  <span style={{ width: `${value}%` }} />
                </div>
                <strong>{value}%</strong>
              </div>
            </div>
          )
        })}
        {!courses.length ? <div className="empty-state">No registered courses have progress yet.</div> : null}
      </div>
    </PageShell>
  )
}

function CertificatePage() {
  const [courses, setCourses] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/student/dashboard`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load certificates')))
      .then((data) => setCourses((data.student_courses || []).filter((course) => course.progress >= 100)))
      .catch((error) => console.error('Certificate fetch failed', error))
  }, [])

  return (
    <PageShell title="Certificate" subtitle="Your achievement record is ready.">
      {courses.length ? <div className="certificate-card">
        <p className="eyebrow accent">CourseHub Certification</p>
        <h2>Completion Certificate</h2>
        <p>Completed courses are listed below.</p>
        <div className="certificate-meta">
          {courses.map((course) => <span key={course.id}>Course: {course.course_name}</span>)}
        </div>
      </div> : <div className="empty-state">No completed courses are available for certificates yet.</div>}
    </PageShell>
  )
}

function AboutPage() {
  return (
    <PageShell title="About" subtitle="A learning platform designed for structured, modern education.">
      <div className="detail-card">
        <p>
          CourseHub brings together students, educators, and administrators in one digital ecosystem. It supports course discovery,
          enrollment workflows, progress reporting, and institutional management.
        </p>
      </div>
    </PageShell>
  )
}

function ContactPage() {
  return (
    <PageShell title="Contact" subtitle="We are here to help with product, billing, and learning support.">
      <div className="detail-card">
        <p>Email: support@coursehub.example</p>
        <p>Phone: +1 (800) 555-0148</p>
        <p>Address: 54 Learning Avenue, Innovation District</p>
      </div>
    </PageShell>
  )
}

function ProfilePage() {
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '', department: '' })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/profile`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Failed to load profile')
        }
        const data = await response.json()
        setProfile(data)
      } catch (error) {
        console.error('Profile fetch failed', error)
      }
    }

    loadProfile()
  }, [])

  return (
    <PageShell title="Profile" subtitle="Update your student details and academic preferences.">
      <form className="form-card two-col panel-card">
        <label>
          Full name
          <input type="text" value={profile.full_name} readOnly />
        </label>
        <label>
          Email
          <input type="email" value={profile.email} readOnly />
        </label>
        <label>
          Phone
          <input type="tel" value={profile.phone || ''} readOnly />
        </label>
        <label>
          Department
          <input type="text" value={profile.department || ''} readOnly />
        </label>
        <button className="btn primary full" type="submit">Save profile</button>
      </form>
    </PageShell>
  )
}

function ReportsPage() {
  const [summary, setSummary] = useState({ total_students: 0, total_courses: 0, total_enrollments: 0 })

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/summary`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load reports')))
      .then(setSummary)
      .catch((error) => console.error('Reports fetch failed', error))
  }, [])

  return (
    <PageShell title="Reports" subtitle="Institutional metrics and course performance.">
      <div className="dashboard-panel">
        <div className="stats-grid">
          <div className="stat-tile">
            <strong>{summary.total_students}</strong>
            <span>Total learners</span>
          </div>
          <div className="stat-tile">
            <strong>{summary.total_courses}</strong>
            <span>Active courses</span>
          </div>
          <div className="stat-tile">
            <strong>{summary.total_enrollments}</strong>
            <span>Total enrollments</span>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="table-card compact-table">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Enrolled</th>
                <th>Completion</th>
                <th>Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan="4" className="empty-state">Detailed course reports will appear as enrollment data is recorded.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}

function AdminDatabasePage() {
  const [collection, setCollection] = useState('courses')
  const [records, setRecords] = useState([])
  const [mirrorStatus, setMirrorStatus] = useState(null)
  const [editor, setEditor] = useState(null)
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState('')

  useEffect(() => {
    let active = true
    const loadRecords = async () => {
      try {
        const [recordsResponse, statusResponse] = await Promise.all([
          fetch(`${API_BASE}/api/admin/database/${collection}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch(`${API_BASE}/api/admin/database/status`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
        ])
        const [recordsData, statusData] = await Promise.all([
          recordsResponse.json(),
          statusResponse.json(),
        ])
        if (!recordsResponse.ok) throw new Error(recordsData.message || 'Unable to load records')
        if (!active) return
        setRecords(Array.isArray(recordsData) ? recordsData : [])
        setMirrorStatus(statusData)
        setRefreshedAt(new Date().toLocaleTimeString())
        setError('')
      } catch (loadError) {
        if (active) setError(loadError.message)
      }
    }

    loadRecords()
    const intervalId = window.setInterval(loadRecords, 5000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [collection])

  const refreshRecords = async () => {
    setLoading(true)
    try {
      const [recordsResponse, statusResponse] = await Promise.all([
        fetch(`${API_BASE}/api/admin/database/${collection}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/admin/database/status`, { credentials: 'include' }),
      ])
      const [recordsData, statusData] = await Promise.all([
        recordsResponse.json(),
        statusResponse.json(),
      ])
      if (!recordsResponse.ok) throw new Error(recordsData.message || 'Unable to load records')
      setRecords(Array.isArray(recordsData) ? recordsData : [])
      setMirrorStatus(statusData)
      setRefreshedAt(new Date().toLocaleTimeString())
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  const beginCreate = () => {
    setEditor({ mode: 'create' })
    setDraft(JSON.stringify(databaseTemplates[collection], null, 2))
    setNotice('')
    setError('')
  }

  const beginUpdate = (record) => {
    setEditor({ mode: 'update', id: record.id })
    setDraft(JSON.stringify(record, null, 2))
    setNotice('')
    setError('')
  }

  const saveRecord = async (event) => {
    event.preventDefault()
    let body
    try {
      body = JSON.parse(draft)
      if (!body || Array.isArray(body) || typeof body !== 'object') {
        throw new Error('Enter one JSON object.')
      }
    } catch (parseError) {
      setError(parseError.message)
      return
    }

    const isCreate = editor.mode === 'create'
    const url = isCreate
      ? `${API_BASE}/api/admin/database/${collection}`
      : `${API_BASE}/api/admin/database/${collection}/${editor.id}`
    try {
      const response = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to save record')
      setEditor(null)
      setNotice(`${isCreate ? 'Record added' : 'Record updated'} in ${collection}.`)
      setError('')
      await refreshRecords()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const deleteRecord = async (record) => {
    if (!window.confirm(`Delete ${collection} record ${record.id}?`)) return
    try {
      const response = await fetch(`${API_BASE}/api/admin/database/${collection}/${record.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to delete record')
      setNotice(`Record ${record.id} deleted from ${collection}.`)
      setError('')
      await refreshRecords()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <PageShell title="Database" subtitle="Live application records with a JSON mirror.">
      <section className="panel-card database-panel">
        <div className="database-toolbar">
          <label>
            Collection
            <select value={collection} onChange={(event) => { setCollection(event.target.value); setEditor(null) }}>
              {databaseCollections.map((name) => <option key={name} value={name}>{name.replaceAll('_', ' ')}</option>)}
            </select>
          </label>
          <div className="database-toolbar-actions">
            <button className="btn secondary" type="button" onClick={refreshRecords} disabled={loading}>
              {loading ? 'Loading…' : 'Get data'}
            </button>
            <button className="btn primary" type="button" onClick={beginCreate}>Add record</button>
          </div>
          <div className={`mirror-status ${mirrorStatus?.ok ? 'is-synced' : 'has-error'}`} role="status">
            {mirrorStatus?.ok ? 'JSON mirror synced' : mirrorStatus?.error ? `Mirror error: ${mirrorStatus.error}` : 'JSON mirror status unavailable'}
            {refreshedAt ? <small>Last refreshed {refreshedAt}</small> : null}
          </div>
        </div>

        {notice ? <p className="form-message success" role="status">{notice}</p> : null}
        {error ? <p className="form-message error" role="alert">{error}</p> : null}

        {editor ? (
          <form className="database-editor" onSubmit={saveRecord}>
            <div className="section-head">
              <h3>{editor.mode === 'create' ? `Add ${collection.replaceAll('_', ' ')}` : `Update ${collection.replaceAll('_', ' ')} #${editor.id}`}</h3>
              <button className="btn secondary small" type="button" onClick={() => setEditor(null)}>Cancel</button>
            </div>
            <label>
              Record JSON
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck="false" required />
            </label>
            <button className="btn primary" type="submit">{editor.mode === 'create' ? 'Save record' : 'Update record'}</button>
          </form>
        ) : null}

        <div className="database-table-wrap">
          <table className="database-table">
            <thead>
              <tr><th>ID</th><th>Record</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td><pre>{JSON.stringify(record, null, 2)}</pre></td>
                  <td>
                    <div className="database-row-actions">
                      <button className="btn secondary small" type="button" onClick={() => beginUpdate(record)}>Update</button>
                      <button className="btn danger small" type="button" onClick={() => deleteRecord(record)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!records.length ? <tr><td colSpan="3" className="empty-state">No records in this collection.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  )
}

function NotFoundPage() {
  return (
    <PageShell title="Page not found" subtitle="The route you requested does not exist.">
      <Link className="btn primary" to="/">Go home</Link>
    </PageShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main className="container main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/browse-courses" element={<BrowseCoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailsPage />} />
            <Route path="/courses/:id/content" element={<RoleRoute allowedRoles={['2', '3']}><CourseContentPage /></RoleRoute>} />
            <Route path="/student/dashboard" element={<RoleRoute allowedRoles={['3']}><StudentDashboardPage /></RoleRoute>} />
            <Route path="/faculty/dashboard" element={<RoleRoute allowedRoles={['2']}><FacultyDashboardPage /></RoleRoute>} />
            <Route path="/admin/dashboard" element={<RoleRoute allowedRoles={['1']}><AdminDashboardPage /></RoleRoute>} />
            <Route path="/admin/database" element={<RoleRoute allowedRoles={['1']}><AdminDatabasePage /></RoleRoute>} />
            <Route path="/add-faculty" element={<RoleRoute allowedRoles={['1']}><AddFacultyPage /></RoleRoute>} />
            <Route path="/students" element={<RoleRoute allowedRoles={['1']}><StudentsPage /></RoleRoute>} />
            <Route path="/add-course" element={<RoleRoute allowedRoles={['1']}><AddCoursePage /></RoleRoute>} />
            <Route path="/edit-course/:id" element={<RoleRoute allowedRoles={['1']}><EditCoursePage /></RoleRoute>} />
            <Route path="/my-courses" element={<RoleRoute allowedRoles={['3']}><MyCoursesPage /></RoleRoute>} />
            <Route path="/notifications" element={<RoleRoute allowedRoles={['3']}><NotificationsPage /></RoleRoute>} />
            <Route path="/progress" element={<RoleRoute allowedRoles={['3']}><ProgressPage /></RoleRoute>} />
            <Route path="/certificate" element={<RoleRoute allowedRoles={['3']}><CertificatePage /></RoleRoute>} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/profile" element={<RoleRoute allowedRoles={['3']}><ProfilePage /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute allowedRoles={['1']}><ReportsPage /></RoleRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
