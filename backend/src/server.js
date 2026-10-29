import { createServer } from 'node:http'
import app from './app.js'
import { config } from './config/env.js'
import { connectDatabase } from './services/mongoDatabaseService.js'
import { initializeSocket } from './services/socketService.js'

if (config.databaseProvider !== 'mongodb' && config.databaseProvider !== 'file') {
  throw new Error('DATABASE_PROVIDER must be either "mongodb" or "file".')
}

if (config.databaseProvider === 'mongodb') {
  await connectDatabase(config.mongoUri)
} else {
  console.warn('Using the JSON file database. Set DATABASE_PROVIDER=mongodb for persistent MongoDB storage.')
}

const server = createServer(app)
const io = initializeSocket(server)

server.listen(config.port, config.host, () => {
  console.log(`Course Management backend listening at http://${config.host}:${config.port}`)
})

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.info(`Received ${signal}; shutting down.`)
  try {
    await new Promise((resolve, reject) => {
      io.close((error) => (error ? reject(error) : resolve()))
    })
    if (config.databaseProvider === 'mongodb') await disconnectDatabase()
  } catch (error) {
    console.error('Graceful shutdown failed:', error)
    process.exitCode = 1
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(signal).catch((error) => {
      console.error('Graceful shutdown failed:', error)
      process.exitCode = 1
    })
  })
}

server.on('error', (error) => {
  console.error('HTTP server error:', error)
  shutdown('HTTP server error').catch((shutdownError) => {
    console.error('Graceful shutdown failed:', shutdownError)
    process.exitCode = 1
  })
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
  shutdown('unhandled rejection').catch((shutdownError) => {
    console.error('Graceful shutdown failed:', shutdownError)
  })
  process.exitCode = 1
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  shutdown('uncaught exception').catch((shutdownError) => {
    console.error('Graceful shutdown failed:', shutdownError)
    process.exitCode = 1
  })
  process.exitCode = 1
})
