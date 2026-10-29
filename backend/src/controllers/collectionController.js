import { completeCourseModule as markCourseModuleComplete, createRecord, deleteRecord, findRecord, listRecords, listRecordsPage, replaceRecord, unenrollStudentFromCourse, updateRecord } from '../services/databaseService.js'
import { validateRecord } from '../services/validationService.js'

function publicRecord(record) {
  const { password: _password, ...account } = record
  return account
}

function parsePositiveQuery(value, fallback, field) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  const maximum = field === 'page' ? 100_000 : Number.MAX_SAFE_INTEGER
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    const error = new Error(`${field} must be a positive integer${field === 'page' ? ' no greater than 100000' : ''}.`)
    error.statusCode = 400
    throw error
  }
  return parsed
}

export async function getCollection(request, response, next) {
  try {
    if (request.query.page !== undefined || request.query.limit !== undefined) {
      const page = parsePositiveQuery(request.query.page, 1, 'page')
      const requestedLimit = parsePositiveQuery(request.query.limit, 20, 'limit')
      const limit = Math.min(requestedLimit, 100)
      const filter = request.user?.role === '3'
        ? request.params.collection === 'students'
          ? { user_id: Number(request.user.id) }
          : { student_id: Number(request.studentId) }
        : {}
      const { records, total } = await listRecordsPage(request.params.collection, { page, limit, filter })
      return response.json({
        records: records.map(publicRecord),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    let records = await listRecords(request.params.collection)
    if (request.user?.role === '3') {
      if (request.params.collection === 'students') {
        records = records.filter((record) => String(record.user_id) === request.user.id)
      } else {
        records = records.filter((record) => String(record.student_id) === request.studentId)
      }
    }

    return response.json(records.map(publicRecord))
  } catch (error) {
    next(error)
  }
}

export async function getRecord(request, response, next) {
  try {
    const record = await findRecord(request.params.collection, request.params.id)
    if (!record) return response.status(404).json({ message: 'Record not found.' })
    if (request.user?.role === '3' && request.params.collection === 'students'
      && String(record.user_id) !== request.user.id) {
      return response.status(404).json({ message: 'Record not found.' })
    }
    if (request.user?.role === '3' && request.params.collection !== 'students'
      && String(record.student_id) !== request.studentId) {
      return response.status(404).json({ message: 'Record not found.' })
    }
    return response.json(publicRecord(record))
  } catch (error) {
    return next(error)
  }
}

export async function postRecord(request, response, next) {
  try {
    if (request.params.collection === 'enrollments' && request.user.role !== '3') {
      return response.status(403).json({ message: 'Only students can enroll in courses.' })
    }
    const values = validateRecord(request.params.collection, request.body)
    if (request.params.collection === 'enrollments') values.status = 'Enrolled'
    if (request.user.role === '3' && String(values.student_id) !== request.studentId) {
      return response.status(403).json({ message: 'You can only create records for your own student account.' })
    }
    const record = await createRecord(request.params.collection, values)
    response.status(201).json(publicRecord(record))
  } catch (error) {
    return next(error)
  }
}

export async function getMyCourses(request, response, next) {
  if (request.user.role !== '3') {
    return response.status(403).json({ message: 'Only students can view their enrolled courses.' })
  }

  try {
    const [enrollments, courses] = await Promise.all([
      listRecords('enrollments'),
      listRecords('courses'),
    ])
    const myEnrollments = enrollments
      .filter((record) => String(record.student_id) === request.studentId && record.status !== 'Unenrolled')
      .map((record) => ({
        ...record,
        course: courses.find((course) => String(course.id) === String(record.course_id)) || null,
      }))
      .sort((left, right) => new Date(right.enrollment_date || 0) - new Date(left.enrollment_date || 0))

    return response.json({
      message: 'Enrolled courses fetched successfully.',
      totalEnrollments: myEnrollments.length,
      enrollments: myEnrollments,
    })
  } catch (error) {
    return next(error)
  }
}

export async function unenrollCourse(request, response, next) {
  if (request.user.role !== '3') {
    return response.status(403).json({ message: 'Only students can unenroll from courses.' })
  }

  try {
    const enrollment = await unenrollStudentFromCourse(request.studentId, request.params.courseId)
    if (!enrollment) {
      return response.status(404).json({ message: 'You are not enrolled in this course.' })
    }
    return response.json({
      message: 'Successfully unenrolled from course.',
      enrollment: publicRecord(enrollment),
    })
  } catch (error) {
    return next(error)
  }
}

export async function patchRecord(request, response, next) {
  try {
    const values = validateRecord(request.params.collection, request.body, { partial: true })
    const record = await updateRecord(request.params.collection, request.params.id, values)
    if (!record) return response.status(404).json({ message: 'Record not found.' })
    return response.json(publicRecord(record))
  } catch (error) {
    return next(error)
  }
}

export async function putRecord(request, response, next) {
  try {
    const values = validateRecord(request.params.collection, request.body)
    const record = await replaceRecord(request.params.collection, request.params.id, values)
    if (!record) return response.status(404).json({ message: 'Record not found.' })
    return response.json(publicRecord(record))
  } catch (error) {
    return next(error)
  }
}

export async function removeRecord(request, response, next) {
  try {
    const record = await deleteRecord(request.params.collection, request.params.id)
    if (!record) return response.status(404).json({ message: 'Record not found.' })
    return response.status(204).end()
  } catch (error) {
    return next(error)
  }
}

export async function completeCourseModule(request, response, next) {
  if (request.user.role !== '3') {
    return response.status(403).json({ message: 'Only enrolled students can complete course lessons.' })
  }

  try {
    const result = await markCourseModuleComplete(
      request.studentId,
      request.params.courseId,
      request.params.moduleId,
    )
    return response.json(result)
  } catch (error) {
    return next(error)
  }
}
