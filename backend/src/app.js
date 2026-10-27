import cors from 'cors'
import express from 'express'
import { config } from './config/env.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import routes from './routes/index.js'

const app = express()

if (Buffer.byteLength(config.jwtSecret) < 32) {
  throw new Error('JWT_SECRET must be set to a secret of at least 32 bytes. Generate one with `openssl rand -base64 32`.')
}

app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: '1mb' }))
app.use(routes)
app.use(notFound)
app.use(errorHandler)

export default app
