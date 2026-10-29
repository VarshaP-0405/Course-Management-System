import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { config } from './config/env.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import routes from './routes/index.js'

const app = express()

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

if (Buffer.byteLength(config.jwtSecret) < 32) {
  throw new Error('JWT_SECRET must be set to a secret of at least 32 bytes. Generate one with `openssl rand -base64 32`.')
}

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true)
    const error = new Error('Origin not allowed by CORS.')
    error.statusCode = 403
    return callback(error)
  },
}))
morgan.token('safe-path', (request) => new URL(request.originalUrl, 'http://localhost').pathname)
app.use(morgan(':method :safe-path :status :response-time ms'))
app.use(express.json({ limit: '1mb' }))
app.use(routes)
app.use(notFound)
app.use(errorHandler)

export default app
