import mongoose from 'mongoose'

const { Schema } = mongoose

const definitions = {
  users: {
    fields: {
      email: { type: String, required: true, maxlength: 254, lowercase: true, trim: true },
      password: { type: String, required: true, minlength: 60, maxlength: 60, select: false },
      role: { type: Number, required: true, enum: [1, 2, 3] },
      created_at: String,
    },
    unique: [['email']],
  },
  students: {
    fields: {
      Sid: Number, user_id: Number, first_name: { type: String, required: true, maxlength: 5000 },
      last_name: { type: String, required: true, maxlength: 5000 }, age: Number, gender: String,
      address: String, phone: String, dob: String, department: String, blacklisted: Schema.Types.Mixed,
    },
    unique: [['user_id'], ['Sid']],
  },
  faculty: {
    fields: {
      Fid: Number, user_id: Number, first_name: { type: String, required: true, maxlength: 5000 },
      last_name: { type: String, required: true, maxlength: 5000 }, phone: String, department: String,
      qualification: String, specialization: String, employee_id: String, blacklisted: Schema.Types.Mixed,
    },
    unique: [['user_id'], ['Fid'], ['employee_id']],
  },
  courses: {
    fields: {
      course_name: { type: String, required: true, maxlength: 5000 }, cname: String,
      course_code: { type: String, required: true, maxlength: 5000 }, instructor: String,
      duration: String, credits: { type: Number, min: 0 }, category: String, description: String,
    },
    unique: [['course_code']],
  },
  course_faculty: {
    fields: { course_id: { type: Number, required: true }, faculty_id: { type: Number, required: true } },
    unique: [['course_id', 'faculty_id']],
  },
  modules: {
    fields: {
      course_id: { type: Number, required: true }, title: { type: String, required: true, maxlength: 5000 },
      description: String, module_number: Number, module_numb: Number, video_link: String, notes: String, duration: String,
    },
    unique: [['course_id', 'module_number']],
  },
  enrollments: {
    fields: {
      student_id: { type: Number, required: true }, course_id: { type: Number, required: true },
      status: { type: String, enum: ['Enrolled', 'Completed', 'Unenrolled'] },
      enrollment_date: String, unenrolled_at: String,
    },
    unique: [['student_id', 'course_id']],
  },
  progress: {
    fields: {
      student_id: { type: Number, required: true }, course_id: { type: Number, required: true },
      completed_modules: { type: Number, min: 0 }, total_modules: { type: Number, min: 0 },
      progress_percentage: { type: Number, min: 0, max: 100 },
    },
    unique: [['student_id', 'course_id']],
  },
  module_completions: {
    fields: {
      student_id: { type: Number, required: true }, module_id: { type: Number, required: true },
      completed_at: String,
    },
    unique: [['student_id', 'module_id']],
  },
  notifications: {
    fields: {
      student_id: { type: Number, required: true }, title: { type: String, required: true, maxlength: 5000 },
      message: { type: String, required: true, maxlength: 5000 }, is_read: Boolean, created_at: String,
    },
  },
  messages: {
    fields: {
      sender_id: { type: Number, required: true },
      recipient_id: { type: Number, required: true },
      text: { type: String, required: true, maxlength: 2000 },
      created_at: { type: String, required: true },
    },
  },
  reviews: {
    fields: {
      student_id: { type: Number, required: true }, course_id: { type: Number, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 }, review: { type: String, required: true, maxlength: 5000 },
    },
    unique: [['student_id', 'course_id']],
  },
}

export const collectionNames = Object.keys(definitions)

export const models = Object.fromEntries(collectionNames.map((collection) => {
  const schema = new Schema({
    id: { type: Number, required: true, unique: true, index: true },
    ...definitions[collection].fields,
  }, {
    collection,
    versionKey: false,
    timestamps: false,
    strict: true,
  })

  for (const fields of definitions[collection].unique || []) {
    const index = Object.fromEntries(fields.map((field) => [field, 1]))
    const optionalSingleField = fields.length === 1
      && ((collection === 'students' && ['user_id', 'Sid'].includes(fields[0]))
        || (collection === 'faculty' && ['user_id', 'Fid', 'employee_id'].includes(fields[0])))
    const options = { unique: true }
    if (optionalSingleField) options.sparse = true
    if (collection === 'modules' && fields.includes('module_number')) {
      options.partialFilterExpression = { module_number: { $exists: true } }
    }
    schema.index(index, options)
  }

  if (collection === 'messages') {
    schema.index({ sender_id: 1, recipient_id: 1, created_at: -1 })
    schema.index({ recipient_id: 1, sender_id: 1, created_at: -1 })
  }
  if (collection === 'notifications') schema.index({ student_id: 1, created_at: -1 })

  return [collection, mongoose.models[collection] || mongoose.model(collection, schema)]
}))

export const Counter = mongoose.models.Counter || mongoose.model('Counter', new Schema({
  _id: { type: String },
  value: { type: Number, required: true, min: 0 },
}, { collection: '_counters', versionKey: false }))
