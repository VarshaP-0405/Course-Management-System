import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'
import { after, before, test } from 'node:test'

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)))
let temporaryDirectory
let server
let baseUrl
let adminToken
let studentToken

before(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'course-management-api-'))
  const source = await readFile(join(root, 'mockapi/db.json'), 'utf8')
  const dataFile = join(temporaryDirectory, 'db.json')
  await writeFile(dataFile, source)
  process.env.DATA_FILE = dataFile
  process.env.JWT_SECRET = 'test-jwt-secret-for-course-management-1234567890'

  const { default: app } = await import('../src/app.js')
  server = createServer(app)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'courseadmin123@gmail.com', password: 'demo123', role: 1 }),
  })
  assert.equal(loginResponse.status, 200)
  adminToken = (await loginResponse.json()).token
  assert.ok(adminToken)
})

after(async () => {
  if (server?.listening) {
    server.close()
    await once(server, 'close')
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
})

async function request(path, { body, token = adminToken, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = response.status === 204 ? null : await response.json()
  return { status: response.status, data }
}

test('student, course, authentication, and page collection endpoints', async (t) => {
  await t.test('serves JSON for all page collections and keeps legacy routes compatible', async () => {
    assert.equal((await request('/api/courses', { token: null })).status, 200)
    assert.equal((await request('/api/modules', { token: null })).status, 200)
    const anonymous = await request('/api/students', { token: null })
    assert.equal(anonymous.status, 401)
    const invalidToken = await request('/api/students', { token: `${adminToken}invalid` })
    assert.equal(invalidToken.status, 401)
    const expiredToken = jwt.sign({ role: 1 }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: '1',
      expiresIn: -1,
    })
    assert.equal((await request('/api/students', { token: expiredToken })).status, 401)
    assert.equal((await request('/api/auth/me')).data.role, 1)

    const collections = [
      'users', 'students', 'faculty', 'courses', 'course_faculty',
      'modules', 'enrollments', 'progress', 'notifications', 'reviews',
    ]
    for (const collection of collections) {
      const { status, data } = await request(`/api/${collection}`)
      assert.equal(status, 200, collection)
      assert.ok(Array.isArray(data), collection)
    }

    const legacy = await request('/courses')
    assert.equal(legacy.status, 200)
    assert.ok(Array.isArray(legacy.data))

    const users = await request('/api/users')
    assert.equal(Object.hasOwn(users.data[0], 'password'), false)

    const user = await request('/api/users', {
      method: 'POST',
      body: { email: 'api-test-faculty@example.test', password: 'faculty123', role: 2 },
    })
    assert.equal(user.status, 201)
    assert.equal(Object.hasOwn(user.data, 'password'), false)

    const faculty = await request('/api/faculty', {
      method: 'POST',
      body: {
        first_name: 'Api',
        last_name: 'Faculty',
        user_id: user.data.id,
        department: 'Engineering',
      },
    })
    assert.equal(faculty.status, 201)
    assert.equal(Object.hasOwn(faculty.data, 'password'), false)
    assert.equal(Object.hasOwn(faculty.data, 'email'), false)
  })

  await t.test('registers a student atomically and authenticates without exposing credentials', async () => {
    const invalid = await request('/api/auth/register', {
      method: 'POST',
      body: { email: 'not-an-email', password: 'short', first_name: '', last_name: 'Student' },
    })
    assert.equal(invalid.status, 400)

    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'api-test-student@example.test',
        password: 'testpass123',
        first_name: 'Api',
        last_name: 'Student',
        department: 'Engineering',
      },
    })
    assert.equal(registration.status, 201)
    assert.equal(registration.data.user.role, 3)
    assert.equal(registration.data.student.user_id, registration.data.user.id)
    assert.equal(Object.hasOwn(registration.data.user, 'password'), false)

    const duplicate = await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'API-TEST-STUDENT@example.test',
        password: 'testpass123',
        first_name: 'Duplicate',
        last_name: 'Student',
      },
    })
    assert.equal(duplicate.status, 409)

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'api-test-student@example.test', password: 'testpass123', role: 3 },
    })
    assert.equal(login.status, 200)
    assert.equal(login.data.id, registration.data.user.id)
    assert.equal(Object.hasOwn(login.data, 'password'), false)
    assert.equal(typeof login.data.token, 'string')
    studentToken = login.data.token
    const identity = await request('/api/auth/me', { token: studentToken })
    assert.equal(identity.data.id, registration.data.user.id)
    assert.equal(identity.data.role, 3)

    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'api-test-student@example.test', password: 'wrongpass' },
    })
    assert.equal(badLogin.status, 401)

    const student = await request(`/api/students/${registration.data.student.id}`, { token: studentToken })
    assert.equal(student.status, 200)
    assert.equal(student.data.first_name, 'Api')

    const privateFaculty = await request('/api/faculty', { token: studentToken })
    assert.equal(privateFaculty.status, 403)
    assert.equal((await request('/api/users', { token: studentToken })).status, 403)

    const forbiddenCourseWrite = await request('/api/courses', {
      method: 'POST',
      token: studentToken,
      body: { course_name: 'Student course', course_code: 'STU-1' },
    })
    assert.equal(forbiddenCourseWrite.status, 403)

    const ownEnrollment = await request('/api/enrollments', {
      method: 'POST',
      token: studentToken,
      body: { student_id: registration.data.student.id, course_id: 1, status: 'Enrolled' },
    })
    assert.equal(ownEnrollment.status, 201)
    assert.equal(ownEnrollment.data.student_id, registration.data.student.id)

    const otherEnrollment = await request('/api/enrollments', {
      method: 'POST',
      token: studentToken,
      body: { student_id: 1, course_id: 1, status: 'Enrolled' },
    })
    assert.equal(otherEnrollment.status, 403)
  })

  await t.test('validates and supports student create, read, update, replace, and delete', async () => {
    const invalid = await request('/api/students', { method: 'POST', body: { first_name: 'Only' } })
    assert.equal(invalid.status, 400)
    const clientAssignedId = await request('/api/students', {
      method: 'POST',
      body: { id: 99, first_name: 'Only', last_name: 'Student' },
    })
    assert.equal(clientAssignedId.status, 400)

    const created = await request('/api/students', {
      method: 'POST',
      body: { first_name: 'Test', last_name: 'Learner', department: 'Science' },
    })
    assert.equal(created.status, 201)
    const id = created.data.id

    const updated = await request(`/api/students/${id}`, {
      method: 'PATCH',
      body: { department: 'Mathematics' },
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.data.department, 'Mathematics')

    const replaced = await request(`/api/students/${id}`, {
      method: 'PUT',
      body: { first_name: 'Replaced', last_name: 'Learner' },
    })
    assert.equal(replaced.status, 200)
    assert.equal(replaced.data.first_name, 'Replaced')
    assert.equal(Object.hasOwn(replaced.data, 'department'), false)

    const deleted = await request(`/api/students/${id}`, { method: 'DELETE' })
    assert.equal(deleted.status, 204)
    assert.equal((await request(`/api/students/${id}`)).status, 404)
  })

  await t.test('validates and supports course create, read, update, and delete', async () => {
    const invalid = await request('/api/courses', {
      method: 'POST',
      body: { course_name: 'Incomplete course' },
    })
    assert.equal(invalid.status, 400)

    const created = await request('/api/courses', {
      method: 'POST',
      body: {
        course_name: 'API Test Course',
        course_code: 'TEST-API',
        instructor: 'Test Instructor',
        credits: 3,
      },
    })
    assert.equal(created.status, 201)
    const id = created.data.id

    assert.equal((await request(`/api/courses/${id}`)).data.course_name, 'API Test Course')

    const updated = await request(`/api/courses/${id}`, {
      method: 'PATCH',
      body: { description: 'Updated through PATCH.' },
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.data.description, 'Updated through PATCH.')

    const replaced = await request(`/api/courses/${id}`, {
      method: 'PUT',
      body: { course_name: 'Replacement Course', course_code: 'TEST-REPLACE' },
    })
    assert.equal(replaced.status, 200)
    assert.equal(replaced.data.course_name, 'Replacement Course')

    assert.equal((await request(`/api/courses/${id}`, { method: 'DELETE' })).status, 204)
    assert.equal((await request(`/api/courses/${id}`)).status, 404)
  })

  await t.test('enforces unique keys, foreign keys, and restricted deletes', async () => {
    const duplicateEmail = await request('/api/users', {
      method: 'POST',
      body: { email: 'VARSHa@gmail.com', password: 'another123', role: 3 },
    })
    assert.equal(duplicateEmail.status, 409)

    const duplicateCourseCode = await request('/api/courses', {
      method: 'POST',
      body: { course_name: 'Duplicate code', course_code: 'PY101' },
    })
    assert.equal(duplicateCourseCode.status, 409)

    const missingCourseReference = await request('/api/modules', {
      method: 'POST',
      body: { course_id: 9999, title: 'Orphan module' },
    })
    assert.equal(missingCourseReference.status, 409)

    const createdCourse = await request('/api/courses', {
      method: 'POST',
      body: { course_name: 'Referenced course', course_code: 'REF-101' },
    })
    assert.equal(createdCourse.status, 201)
    const module = await request('/api/modules', {
      method: 'POST',
      body: { course_id: createdCourse.data.id, title: 'Linked module', module_number: 1 },
    })
    assert.equal(module.status, 201)

    const blockedDelete = await request(`/api/courses/${createdCourse.data.id}`, { method: 'DELETE' })
    assert.equal(blockedDelete.status, 409)
    assert.equal((await request(`/api/modules/${module.data.id}`, { method: 'DELETE' })).status, 204)
    assert.equal((await request(`/api/courses/${createdCourse.data.id}`, { method: 'DELETE' })).status, 204)
  })

  await t.test('supports CRUD for every remaining page collection', async () => {
    const records = [
      {
        collection: 'faculty',
          body: { first_name: 'Page', last_name: 'Faculty' },
        patch: { department: '' },
        replacement: { first_name: 'Updated', last_name: 'Faculty' },
      },
      {
        collection: 'course_faculty',
        body: { course_id: 1, faculty_id: 1 },
        patch: { faculty_id: 1 },
        replacement: { course_id: 1, faculty_id: 1 },
      },
      {
        collection: 'modules',
        body: { course_id: 1, title: 'Page module', module_number: 1 },
        patch: { title: 'Updated module' },
        replacement: { course_id: 1, title: 'Replacement module' },
      },
      {
        collection: 'enrollments',
        body: { student_id: 1, course_id: 2, status: 'Enrolled' },
        patch: { status: 'Completed' },
        replacement: { student_id: 1, course_id: 2, status: 'Enrolled' },
      },
      {
        collection: 'progress',
        body: { student_id: 1, course_id: 2, completed_modules: 0, total_modules: 1, progress_percentage: 0 },
        patch: { progress_percentage: 100 },
        replacement: { student_id: 1, course_id: 2, completed_modules: 1, total_modules: 1, progress_percentage: 100 },
      },
      {
        collection: 'notifications',
        body: { student_id: 1, title: 'Page notification', message: 'Test message', is_read: false },
        patch: { is_read: true },
        replacement: { student_id: 1, title: 'Updated notification', message: 'Updated message' },
      },
      {
        collection: 'reviews',
        body: { student_id: 1, course_id: 2, rating: 5, review: 'Page review' },
        patch: { rating: 4 },
        replacement: { student_id: 1, course_id: 2, rating: 3, review: 'Updated review' },
      },
    ]

    for (const { collection, body, patch, replacement } of records) {
      const created = await request(`/api/${collection}`, { method: 'POST', body })
      assert.equal(created.status, 201, collection)
      const id = created.data.id

      assert.equal((await request(`/api/${collection}/${id}`)).status, 200, collection)
      assert.equal((await request(`/api/${collection}/${id}`, { method: 'PATCH', body: patch })).status, 200, collection)
      assert.equal((await request(`/api/${collection}/${id}`, { method: 'PUT', body: replacement })).status, 200, collection)
      assert.equal((await request(`/api/${collection}/${id}`, { method: 'DELETE' })).status, 204, collection)
    }

    const emptyPatch = await request('/api/courses/1', { method: 'PATCH', body: {} })
    assert.equal(emptyPatch.status, 400)

    const missingRoute = await request('/api/not-a-collection')
    assert.equal(missingRoute.status, 404)
    assert.equal(typeof missingRoute.data.message, 'string')
  })
})
