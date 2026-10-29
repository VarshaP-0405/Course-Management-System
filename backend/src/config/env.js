import 'dotenv/config'
import { resolve } from 'node:path'

const corsOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const port = Number(process.env.PORT || 3002)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.')
}

export const config = {
  host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  port,
  corsOrigins,
  databaseProvider: process.env.DATABASE_PROVIDER || 'file',
  mongoUri: process.env.MONGO_URI || '',
  dataFile: resolve(process.cwd(), process.env.DATA_FILE || '../mockapi/db.json'),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
}
