export function getHome(_request, response) {
  response.json({ status: 'ok', message: 'Course Management backend is running.' })
}

import mongoose from 'mongoose'
import { config } from '../config/env.js'

export function getHealth(_request, response) {
  const database = config.databaseProvider === 'file'
    ? 'file'
    : mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  const healthy = database !== 'disconnected'
  response.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'error',
    service: 'course-management-api',
    database,
    timestamp: new Date().toISOString(),
  })
}
