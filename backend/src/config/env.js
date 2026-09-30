import 'dotenv/config'
import { resolve } from 'node:path'

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3002),
  corsOrigins,
  dataFile: resolve(process.cwd(), process.env.DATA_FILE || '../mockapi/db.json'),
}
