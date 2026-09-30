import { createRecord, deleteRecord, findRecord, listRecords, updateRecord } from '../services/databaseService.js'

export async function getCollection(request, response, next) {
  try {
    response.json(await listRecords(request.params.collection))
  } catch (error) {
    next(error)
  }
}

export async function getRecord(request, response, next) {
  try {
    const record = await findRecord(request.params.collection, request.params.id)
    if (!record) return response.status(404).json({ message: 'Record not found.' })
    return response.json(record)
  } catch (error) {
    return next(error)
  }
}

export async function postRecord(request, response, next) {
  try {
    response.status(201).json(await createRecord(request.params.collection, request.body || {}))
  } catch (error) {
    next(error)
  }
}

export async function patchRecord(request, response, next) {
  try {
    const record = await updateRecord(request.params.collection, request.params.id, request.body || {})
    if (!record) return response.status(404).json({ message: 'Record not found.' })
    return response.json(record)
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
