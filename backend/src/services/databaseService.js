import { readFile, writeFile } from 'node:fs/promises'
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
    const nextId = records.reduce((maximum, record) => Math.max(maximum, Number(record.id) || 0), 0) + 1
    const record = { ...values, id: nextId }
    validateDatabaseRecord(database, collection, record)
    records.push(record)
    return record
  })
}

export async function registerStudentAccount({ email, password, first_name, last_name, phone = '', department = '' }) {
  return updateDatabase((database) => {
    const users = collectionFrom(database, 'users')
    const students = collectionFrom(database, 'students')
    const user = {
      id: users.reduce((maximum, record) => Math.max(maximum, Number(record.id) || 0), 0) + 1,
      email: email.trim(),
      password,
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
    return records.splice(index, 1)[0]
  })
}
