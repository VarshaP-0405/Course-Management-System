import cors from 'cors'
import express from 'express'
import { config } from './config/env.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import routes from './routes/index.js'

const app = express()

app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: '1mb' }))
app.use(routes)
app.use(notFound)
app.use(errorHandler)

export default app
