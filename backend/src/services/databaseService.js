import { readFile, writeFile } from 'node:fs/promises'
import { config } from '../config/env.js'

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
    records.push(record)
    return record
  })
}

export async function updateRecord(collection, id, values) {
  return updateDatabase((database) => {
    const records = collectionFrom(database, collection)
    const index = records.findIndex((record) => String(record.id) === String(id))
    if (index < 0) return null
    records[index] = { ...records[index], ...values, id: records[index].id }
    return records[index]
  })
}

export async function deleteRecord(collection, id) {
  return updateDatabase((database) => {
    const records = collectionFrom(database, collection)
    const index = records.findIndex((record) => String(record.id) === String(id))
    if (index < 0) return null
    return records.splice(index, 1)[0]
  })
}
