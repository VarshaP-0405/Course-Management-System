import { createRecord, deleteRecord, findRecord, listRecords, replaceRecord, updateRecord } from '../services/databaseService.js'
import { validateRecord } from '../services/validationService.js'

function publicRecord(record) {
  const { password: _password, ...account } = record
  return account
}

export async function getCollection(request, response, next) {
  try {
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
    const values = validateRecord(request.params.collection, request.body)
    if (request.user.role === '3' && String(values.student_id) !== request.studentId) {
      return response.status(403).json({ message: 'You can only create records for your own student account.' })
    }
    const record = await createRecord(request.params.collection, values)
    response.status(201).json(publicRecord(record))
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
