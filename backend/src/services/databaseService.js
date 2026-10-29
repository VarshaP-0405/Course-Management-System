import { readFile, writeFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import { config } from '../config/env.js'
import { ensureRecordCanBeDeleted, validateDatabaseRecord } from './databaseConstraints.js'

let writeQueue = Promise.resolve()

async function loadDatabase() {
  return JSON.parse(await readFile(config.dataFile, 'utf8'))
}

export async function getDatabase() {
  await writeQueue
  return loadDatabase()
}

async function updateDatabase(update) {
  const operation = writeQueue.then(async () => {
    const database = await loadDatabase()
    const result = await update(database)
    await writeFile(config.dataFile, `${JSON.stringify(database, null, 2)}\n`)
    return result
  })
  writeQueue = operation.catch(() => undefined)
  return operation
}

function collectionFrom(database, collection) {
  const records = database[collection]
  if (!Array.isArray(records)) {
    const error = new Error(`Unknown collection: ${collection}`)
    error.statusCode = 404
    throw error
  }
  return records
}

function refreshCourseProgress(database, courseId) {
  const modules = collectionFrom(database, 'modules')
  const completions = collectionFrom(database, 'module_completions')
  const progressRecords = collectionFrom(database, 'progress')
  const totalModules = modules.filter((record) => String(record.course_id) === String(courseId)).length

  for (const progress of progressRecords.filter((record) => String(record.course_id) === String(courseId))) {
    const completedModuleIds = new Set(completions
      .filter((record) => String(record.student_id) === String(progress.student_id))
      .map((record) => String(record.module_id)))
    const completedModules = modules.filter((record) => String(record.course_id) === String(courseId)
      && completedModuleIds.has(String(record.id))).length
    progress.completed_modules = completedModules
    progress.total_modules = totalModules
    progress.progress_percentage = totalModules ? Math.round((completedModules / totalModules) * 100) : 0
  }

  for (const enrollment of collectionFrom(database, 'enrollments')
    .filter((record) => String(record.course_id) === String(courseId) && record.status === 'Completed')) {
    const progress = progressRecords.find((record) => String(record.student_id) === String(enrollment.student_id)
      && String(record.course_id) === String(courseId))
    if (!progress || Number(progress.progress_percentage) < 100) enrollment.status = 'Enrolled'
  }
}

export async function listRecords(collection) {
  return collectionFrom(await getDatabase(), collection)
}

export async function findRecord(collection, id) {
  const records = collectionFrom(await getDatabase(), collection)
  return records.find((record) => String(record.id) === String(id)) || null
}

export async function createRecord(collection, values) {
  return updateDatabase((database) => {
    const records = collectionFrom(database, collection)
    if (collection === 'enrollments') {
      const existing = records.find((record) => String(record.student_id) === String(values.student_id)
        && String(record.course_id) === String(values.course_id))
      if (existing?.status === 'Unenrolled') {
        existing.status = 'Enrolled'
        existing.enrollment_date = values.enrollment_date || new Date().toISOString()
        return existing
      }
    }
    const nextId = records.reduce((maximum, record) => Math.max(maximum, Number(record.id) || 0), 0) + 1
    const record = { ...values, id: nextId }
    validateDatabaseRecord(database, collection, record)
    records.push(record)
    if (collection === 'modules') refreshCourseProgress(database, record.course_id)
    return record
  })
}

export async function unenrollStudentFromCourse(studentId, courseId) {
  return updateDatabase((database) => {
    const enrollments = collectionFrom(database, 'enrollments')
    const enrollment = enrollments.find((record) => String(record.student_id) === String(studentId)
      && String(record.course_id) === String(courseId)
      && record.status !== 'Unenrolled')
    if (!enrollment) return null
    if (enrollment.status === 'Completed') {
      const error = new Error('Completed courses cannot be unenrolled; your completion record is preserved.')
      error.statusCode = 409
      throw error
    }
    enrollment.status = 'Unenrolled'
    enrollment.unenrolled_at = new Date().toISOString()
    return enrollment
  })
}

export async function registerStudentAccount({ email, password, first_name, last_name, phone = '', department = '' }) {
  const passwordHash = await bcrypt.hash(password, 12)
  return updateDatabase((database) => {
    const users = collectionFrom(database, 'users')
    const students = collectionFrom(database, 'students')
    const user = {
      id: users.reduce((maximum, record) => Math.max(maximum, Number(record.id) || 0), 0) + 1,
      email: email.trim(),
      password: passwordHash,
      role: 3,
      created_at: new Date().toISOString(),
    }
    validateDatabaseRecord(database, 'users', user)
    users.push(user)
    const student = {
      id: students.reduce((maximum, record) => Math.max(maximum, Number(record.id) || 0), 0) + 1,
      user_id: user.id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone.trim(),
      department: department.trim(),
      blacklisted: 'N',
    }
    validateDatabaseRecord(database, 'students', student)
    students.push(student)
    return { user, student }
  })
}

export async function completeCourseModule(studentId, courseId, moduleId) {
  return updateDatabase((database) => {
    const students = collectionFrom(database, 'students')
    const modules = collectionFrom(database, 'modules')
    const enrollments = collectionFrom(database, 'enrollments')
    const completions = collectionFrom(database, 'module_completions')
    const progressRecords = collectionFrom(database, 'progress')
    const student = students.find((record) => String(record.id) === String(studentId))
    const module = modules.find((record) => String(record.id) === String(moduleId)
      && String(record.course_id) === String(courseId))
    const enrollment = enrollments.find((record) => String(record.student_id) === String(studentId)
      && String(record.course_id) === String(courseId)
      && record.status !== 'Unenrolled')

    if (!student || !enrollment) {
      const error = new Error('You must be enrolled in this course to record lesson completion.')
      error.statusCode = 403
      throw error
    }
    if (!module) {
      const error = new Error('Course lesson not found.')
      error.statusCode = 404
      throw error
    }

    let completion = completions.find((record) => String(record.student_id) === String(studentId)
      && String(record.module_id) === String(moduleId))
    if (!completion) {
      const nextId = completions.reduce((maximum, record) => Math.max(maximum, Number(record.id) || 0), 0) + 1
      completion = { id: nextId, student_id: Number(studentId), module_id: Number(moduleId), completed_at: new Date().toISOString() }
      validateDatabaseRecord(database, 'module_completions', completion)
      completions.push(completion)
    }

    const courseModules = modules.filter((record) => String(record.course_id) === String(courseId))
    const courseModuleIds = new Set(courseModules.map((record) => String(record.id)))
    const completedModuleIds = completions
      .filter((record) => String(record.student_id) === String(studentId))
      .filter((record) => courseModuleIds.has(String(record.module_id)))
      .map((record) => String(record.module_id))
    const completedModules = courseModules.filter((record) => completedModuleIds.includes(String(record.id))).length
    const totalModules = courseModules.length
    const progressPercentage = totalModules ? Math.round((completedModules / totalModules) * 100) : 0
    const existingProgress = progressRecords.find((record) => String(record.student_id) === String(studentId)
      && String(record.course_id) === String(courseId))
    let progress

    if (existingProgress) {
      Object.assign(existingProgress, {
        completed_modules: completedModules,
        total_modules: totalModules,
        progress_percentage: progressPercentage,
      })
      validateDatabaseRecord(database, 'progress', existingProgress, existingProgress.id)
      progress = existingProgress
    } else {
      const nextId = progressRecords.reduce((maximum, record) => Math.max(maximum, Number(record.id) || 0), 0) + 1
      progress = {
        id: nextId,
        student_id: Number(studentId),
        course_id: Number(courseId),
        completed_modules: completedModules,
        total_modules: totalModules,
        progress_percentage: progressPercentage,
      }
      validateDatabaseRecord(database, 'progress', progress)
      progressRecords.push(progress)
    }

    const courseCompleted = totalModules > 0 && completedModules === totalModules
    if (courseCompleted) enrollment.status = 'Completed'

    return {
      progress,
      completedModuleIds,
      completions: completions.filter((record) => String(record.student_id) === String(studentId)
        && courseModuleIds.has(String(record.module_id))),
      courseCompleted,
    }
  })
}

export async function updateRecord(collection, id, values) {
  return updateDatabase((database) => {
    const records = collectionFrom(database, collection)
    const index = records.findIndex((record) => String(record.id) === String(id))
    if (index < 0) return null
    const updated = { ...records[index], ...values, id: records[index].id }
    validateDatabaseRecord(database, collection, updated, id)
    records[index] = updated
    return updated
  })
}

export async function replaceRecord(collection, id, values) {
  return updateDatabase((database) => {
    const records = collectionFrom(database, collection)
    const index = records.findIndex((record) => String(record.id) === String(id))
    if (index < 0) return null
    const replaced = { ...values, id: records[index].id }
    validateDatabaseRecord(database, collection, replaced, id)
    records[index] = replaced
    return replaced
  })
}

export async function deleteRecord(collection, id) {
  return updateDatabase((database) => {
    const records = collectionFrom(database, collection)
    const index = records.findIndex((record) => String(record.id) === String(id))
    if (index < 0) return null
    ensureRecordCanBeDeleted(database, collection, id)
    const [record] = records.splice(index, 1)
    if (collection === 'modules') refreshCourseProgress(database, record.course_id)
    return record
  })
}
