import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { Counter, collectionNames, models } from '../models/index.js'

const foreignKeys = {
  students: [{ field: 'user_id', collection: 'users', role: 3 }],
  faculty: [{ field: 'user_id', collection: 'users', role: 2 }],
  course_faculty: [
    { field: 'course_id', collection: 'courses' },
    { field: 'faculty_id', collection: 'faculty' },
  ],
  modules: [{ field: 'course_id', collection: 'courses' }],
  enrollments: [
    { field: 'student_id', collection: 'students' },
    { field: 'course_id', collection: 'courses' },
  ],
  progress: [
    { field: 'student_id', collection: 'students' },
    { field: 'course_id', collection: 'courses' },
  ],
  module_completions: [
    { field: 'student_id', collection: 'students' },
    { field: 'module_id', collection: 'modules' },
  ],
  notifications: [{ field: 'student_id', collection: 'students' }],
  messages: [
    { field: 'sender_id', collection: 'users' },
    { field: 'recipient_id', collection: 'users' },
  ],
  reviews: [
    { field: 'student_id', collection: 'students' },
    { field: 'course_id', collection: 'courses' },
  ],
}

function serviceError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function publicRecord(record) {
  if (!record) return null
  const { _id, ...result } = record.toObject ? record.toObject() : record
  return result
}

function collectionModel(collection) {
  const model = models[collection]
  if (!model) throw serviceError(`Unknown collection: ${collection}`, 404)
  return model
}

function assertConnected() {
  if (mongoose.connection.readyState !== 1) {
    throw serviceError('MongoDB is not connected. Check MONGO_URI and ensure the database is running.', 503)
  }
}

function normalizeError(error) {
  if (error.code === 11000) {
    error.statusCode = 409
    error.message = 'A record with the same unique value already exists.'
  } else if (error.name === 'ValidationError' || error.name === 'CastError') {
    error.statusCode = 400
  }
  return error
}

async function allocateId(collection) {
  const counter = await Counter.findOneAndUpdate(
    { _id: collection },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  return counter.value
}

async function validateReferences(collection, record) {
  for (const reference of foreignKeys[collection] || []) {
    const id = record[reference.field]
    if (id === undefined || id === null || id === '') continue
    const referencedModel = collectionModel(reference.collection)
    const referencedRecord = await referencedModel.findOne({ id }).lean()
    if (!referencedRecord || (reference.role && String(referencedRecord.role) !== String(reference.role))) {
      throw serviceError(
        `${reference.field} must reference an existing ${reference.collection} record${reference.role ? ` with role ${reference.role}` : ''}.`,
        409,
      )
    }
  }
}

async function updateCourseProgress(courseId) {
  const [modules, progressRecords, enrollments] = await Promise.all([
    models.modules.find({ course_id: courseId }).lean(),
    models.progress.find({ course_id: courseId }).lean(),
    models.enrollments.find({ course_id: courseId }).lean(),
  ])
  const moduleIds = modules.map((module) => module.id)
  const completions = moduleIds.length
    ? await models.module_completions.find({ module_id: { $in: moduleIds } }).lean()
    : []

  for (const progress of progressRecords) {
    const completedModules = new Set(completions
      .filter((completion) => completion.student_id === progress.student_id)
      .map((completion) => completion.module_id)).size
    const percentage = modules.length ? Math.round((completedModules / modules.length) * 100) : 0
    await models.progress.updateOne({ id: progress.id }, {
      $set: {
        completed_modules: completedModules,
        total_modules: modules.length,
        progress_percentage: percentage,
      },
    }, { runValidators: true })
  }

  for (const enrollment of enrollments.filter((record) => record.status === 'Completed')) {
    const progress = progressRecords.find((record) => record.student_id === enrollment.student_id)
    if (!progress || Number(progress.progress_percentage) < 100) {
      await models.enrollments.updateOne({ id: enrollment.id }, { $set: { status: 'Enrolled' } })
    }
  }
}

export async function connectDatabase(uri) {
  if (!uri) throw serviceError('MONGO_URI must be configured before starting the backend.', 500)
  await mongoose.connect(uri)
  for (const collection of collectionNames) {
    const maximum = await models[collection].findOne().sort({ id: -1 }).select({ id: 1 }).lean()
    await Counter.updateOne(
      { _id: collection },
      { $max: { value: maximum?.id || 0 } },
      { upsert: true },
    )
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}

export async function getDatabase() {
  assertConnected()
  return Object.fromEntries(await Promise.all(collectionNames.map(async (collection) => [
    collection,
    (await models[collection].find().lean()).map(publicRecord),
  ])))
}

export async function listRecords(collection) {
  assertConnected()
  try {
    return (await collectionModel(collection).find().lean()).map(publicRecord)
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function listRecordsPage(collection, { page, limit, filter = {} }) {
  assertConnected()
  try {
    const model = collectionModel(collection)
    const total = await model.countDocuments(filter)
    if ((page - 1) * limit >= total) return { records: [], total }
    const records = await model.find(filter).sort({ id: 1 })
      .skip((page - 1) * limit).limit(limit).lean()
    return { records: records.map(publicRecord), total }
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function findUserByEmail(email) {
  assertConnected()
  try {
    const user = await collectionModel('users').findOne({
      email: String(email).trim().toLowerCase(),
    }).select('+password').lean()
    return user ? publicRecord(user) : null
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function listConversationMessages(userId, otherUserId, limit = 100) {
  assertConnected()
  try {
    return (await collectionModel('messages').find({
      $or: [
        { sender_id: Number(userId), recipient_id: Number(otherUserId) },
        { sender_id: Number(otherUserId), recipient_id: Number(userId) },
      ],
    }).sort({ created_at: 1 }).limit(limit).lean()).map(publicRecord)
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function listNotifications(studentId, limit = 50) {
  assertConnected()
  try {
    const filter = studentId === undefined ? {} : { student_id: Number(studentId) }
    return (await collectionModel('notifications').find(filter)
      .sort({ created_at: -1 }).limit(limit).lean()).map(publicRecord)
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function findRecord(collection, id) {
  assertConnected()
  try {
    return publicRecord(await collectionModel(collection).findOne({ id: Number(id) }).lean())
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function createRecord(collection, values) {
  assertConnected()
  const model = collectionModel(collection)
  try {
    if (collection === 'enrollments') {
      const existing = await model.findOne({ student_id: values.student_id, course_id: values.course_id })
      if (existing?.status === 'Unenrolled') {
        existing.status = 'Enrolled'
        existing.enrollment_date = values.enrollment_date || new Date().toISOString()
        return publicRecord(await existing.save())
      }
    }
    await validateReferences(collection, values)
    const preparedValues = collection === 'users' && Object.hasOwn(values, 'password')
      ? { ...values, password: await bcrypt.hash(values.password, 12) }
      : values
    const record = await model.create({ ...preparedValues, id: await allocateId(collection) })
    if (collection === 'modules') await updateCourseProgress(record.course_id)
    return publicRecord(record)
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function unenrollStudentFromCourse(studentId, courseId) {
  assertConnected()
  try {
    const enrollment = await models.enrollments.findOne({
      student_id: Number(studentId),
      course_id: Number(courseId),
      status: { $ne: 'Unenrolled' },
    })
    if (!enrollment) return null
    if (enrollment.status === 'Completed') {
      throw serviceError('Completed courses cannot be unenrolled; your completion record is preserved.', 409)
    }
    enrollment.status = 'Unenrolled'
    enrollment.unenrolled_at = new Date().toISOString()
    return publicRecord(await enrollment.save())
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function registerStudentAccount({ email, password, first_name, last_name, phone = '', department = '' }) {
  assertConnected()
  const passwordHash = await bcrypt.hash(password, 12)
  let user
  try {
    user = await models.users.create({
      id: await allocateId('users'),
      email: email.trim().toLowerCase(),
      password: passwordHash,
      role: 3,
      created_at: new Date().toISOString(),
    })
    const student = await models.students.create({
      id: await allocateId('students'),
      user_id: user.id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone.trim(),
      department: department.trim(),
      blacklisted: 'N',
    })
    return { user: publicRecord(user), student: publicRecord(student) }
  } catch (error) {
    if (user) await models.users.deleteOne({ id: user.id })
    throw normalizeError(error)
  }
}

export async function completeCourseModule(studentId, courseId, moduleId) {
  assertConnected()
  const studentKey = Number(studentId)
  const courseKey = Number(courseId)
  const moduleKey = Number(moduleId)

  try {
    const [student, module, enrollment] = await Promise.all([
      models.students.findOne({ id: studentKey }),
      models.modules.findOne({ id: moduleKey, course_id: courseKey }),
      models.enrollments.findOne({
        student_id: studentKey,
        course_id: courseKey,
        status: { $ne: 'Unenrolled' },
      }),
    ])
    if (!student || !enrollment) {
      throw serviceError('You must be enrolled in this course to record lesson completion.', 403)
    }
    if (!module) throw serviceError('Course lesson not found.', 404)

    let completion = await models.module_completions.findOne({
      student_id: studentKey,
      module_id: moduleKey,
    })
    if (!completion) {
      try {
        completion = await models.module_completions.create({
          id: await allocateId('module_completions'),
          student_id: studentKey,
          module_id: moduleKey,
          completed_at: new Date().toISOString(),
        })
      } catch (error) {
        if (error.code !== 11000) throw error
        completion = await models.module_completions.findOne({
          student_id: studentKey,
          module_id: moduleKey,
        })
      }
    }

    const courseModules = await models.modules.find({ course_id: courseKey }).lean()
    const moduleIds = courseModules.map((item) => item.id)
    const completions = moduleIds.length
      ? await models.module_completions.find({ student_id: studentKey, module_id: { $in: moduleIds } }).lean()
      : []
    const completedModuleIds = completions.map((item) => item.module_id)
    const completedModules = courseModules.filter((item) => completedModuleIds.includes(item.id)).length
    const totalModules = courseModules.length
    const progressPercentage = totalModules ? Math.round((completedModules / totalModules) * 100) : 0
    let progress = await models.progress.findOne({ student_id: studentKey, course_id: courseKey })
    if (!progress) {
      progress = await models.progress.create({
        id: await allocateId('progress'),
        student_id: studentKey,
        course_id: courseKey,
        completed_modules: completedModules,
        total_modules: totalModules,
        progress_percentage: progressPercentage,
      })
    } else {
      progress.completed_modules = completedModules
      progress.total_modules = totalModules
      progress.progress_percentage = progressPercentage
      await progress.save()
    }

    const courseCompleted = totalModules > 0 && completedModules === totalModules
    if (courseCompleted) {
      enrollment.status = 'Completed'
      await enrollment.save()
    }

    return {
      progress: publicRecord(progress),
      completedModuleIds,
      completions: completions.map(publicRecord),
      courseCompleted,
    }
  } catch (error) {
    throw normalizeError(error)
  }
}

async function saveChangedRecord(collection, id, values, replace) {
  assertConnected()
  const model = collectionModel(collection)
  try {
    const record = await model.findOne({ id: Number(id) })
    if (!record) return null
    const changed = replace ? { id: record.id, ...values } : { ...record.toObject(), ...values, id: record.id }
    if (collection === 'users' && Object.hasOwn(values, 'password')) {
      changed.password = await bcrypt.hash(values.password, 12)
    }
    await validateReferences(collection, changed)
    record.set(changed)
    await record.save()
    if (collection === 'modules') await updateCourseProgress(record.course_id)
    return publicRecord(record)
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function updateRecord(collection, id, values) {
  return saveChangedRecord(collection, id, values, false)
}

export async function replaceRecord(collection, id, values) {
  return saveChangedRecord(collection, id, values, true)
}

export async function deleteRecord(collection, id) {
  assertConnected()
  const model = collectionModel(collection)
  try {
    const record = await model.findOne({ id: Number(id) })
    if (!record) return null
    const inboundReferences = Object.entries(foreignKeys)
      .flatMap(([sourceCollection, references]) => references
        .filter((reference) => reference.collection === collection)
        .map((reference) => ({ sourceCollection, field: reference.field })))

    for (const reference of inboundReferences) {
      if (await models[reference.sourceCollection].exists({ [reference.field]: record.id })) {
        throw serviceError(
          `Cannot delete ${collection} record ${id}; it is referenced by ${reference.sourceCollection}.${reference.field}.`,
          409,
        )
      }
    }

    await record.deleteOne()
    if (collection === 'modules') await updateCourseProgress(record.course_id)
    return publicRecord(record)
  } catch (error) {
    throw normalizeError(error)
  }
}
