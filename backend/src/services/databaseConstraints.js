const uniqueKeys = {
  users: [['email']],
  students: [['user_id'], ['Sid']],
  faculty: [['user_id'], ['Fid'], ['employee_id']],
  courses: [['course_code']],
  course_faculty: [['course_id', 'faculty_id']],
  modules: [['course_id', 'module_number']],
  enrollments: [['student_id', 'course_id']],
  progress: [['student_id', 'course_id']],
  module_completions: [['student_id', 'module_id']],
  reviews: [['student_id', 'course_id']],
}

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
  reviews: [
    { field: 'student_id', collection: 'students' },
    { field: 'course_id', collection: 'courses' },
  ],
}

function constraintError(message) {
  const error = new Error(message)
  error.statusCode = 409
  return error
}

function hasValue(record, key) {
  return record[key] !== undefined && record[key] !== null && record[key] !== ''
}

export function validateDatabaseRecord(database, collection, record, ignoreId) {
  const records = database[collection]
  for (const keys of uniqueKeys[collection] || []) {
    if (!keys.every((key) => hasValue(record, key))) continue
    const duplicate = records.some((existing) => String(existing.id) !== String(ignoreId)
      && keys.every((key) => hasValue(existing, key)
        && (key === 'email'
          ? String(existing[key]).trim().toLowerCase() === String(record[key]).trim().toLowerCase()
          : String(existing[key]) === String(record[key]))))
    if (duplicate) {
      throw constraintError(`${keys.join(' and ')} must be unique in ${collection}.`)
    }
  }

  for (const reference of foreignKeys[collection] || []) {
    if (!hasValue(record, reference.field)) continue
    const referencedRecord = database[reference.collection]?.find(
      (item) => String(item.id) === String(record[reference.field]),
    )
    if (!referencedRecord || (reference.role && String(referencedRecord.role) !== String(reference.role))) {
      throw constraintError(`${reference.field} must reference an existing ${reference.collection} record${reference.role ? ` with role ${reference.role}` : ''}.`)
    }
  }
}

export function ensureRecordCanBeDeleted(database, collection, id) {
  const inboundReferences = Object.entries(foreignKeys)
    .flatMap(([sourceCollection, references]) => references
      .filter((reference) => reference.collection === collection)
      .map((reference) => ({ sourceCollection, field: reference.field })))

  for (const { sourceCollection, field } of inboundReferences) {
    const referenced = database[sourceCollection]?.some((record) => String(record[field]) === String(id))
    if (referenced) {
      throw constraintError(`Cannot delete ${collection} record ${id}; it is referenced by ${sourceCollection}.${field}.`)
    }
  }
}
