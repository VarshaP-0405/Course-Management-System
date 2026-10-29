import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { createRecord, findRecord, listRecords } from './databaseService.js'

const messageWindowMs = 60 * 1000
const messageLimit = 10
const messageWindows = new Map()

function socketError(message) {
  return new Error(message)
}

export function initializeSocket(httpServer) {
  messageWindows.clear()
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('Origin not allowed by CORS.'))
      },
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 100_000,
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string' || !token) return next(socketError('Authentication required.'))

    let claims
    try {
      claims = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
    } catch {
      return next(socketError('Invalid authentication token.'))
    }
    if (!claims.sub || !['1', '2', '3'].includes(String(claims.role))) {
      return next(socketError('Invalid authentication token.'))
    }

    try {
      const user = await findRecord('users', claims.sub)
      if (!user || String(user.role) !== String(claims.role)) {
        return next(socketError('Authenticated user not found.'))
      }
      if (['2', '3'].includes(String(user.role))) {
        const collection = String(user.role) === '2' ? 'faculty' : 'students'
        const profile = (await listRecords(collection))
          .find((record) => String(record.user_id) === String(user.id))
        if (!profile) return next(socketError('No profile is linked to this account.'))
        if (profile.blacklisted === 'Y' || profile.blacklisted === true) {
          return next(socketError('This account is disabled.'))
        }
        socket.data.displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      }

      socket.data.user = {
        id: Number(user.id),
        name: socket.data.displayName || (String(user.role) === '1' ? 'Administrator' : 'CourseHub user'),
        role: String(user.role),
      }
      return next()
    } catch (error) {
      console.error('Socket authentication lookup failed:', error)
      return next(socketError('Socket authentication is temporarily unavailable.'))
    }
  })

  io.on('connection', (socket) => {
    const sender = socket.data.user
    socket.join(`user:${sender.id}`)

    socket.on('send_message', async (data, acknowledge) => {
      const respond = typeof acknowledge === 'function' ? acknowledge : () => {}
      const now = Date.now()
      const currentWindow = messageWindows.get(sender.id)
      const activeWindow = currentWindow && now - currentWindow.startedAt < messageWindowMs
        ? currentWindow
        : { startedAt: now, count: 0 }
      if (activeWindow.count >= messageLimit) {
        return respond({ success: false, message: 'Message limit reached. Try again in a minute.' })
      }
      activeWindow.count += 1
      messageWindows.set(sender.id, activeWindow)

      try {
        const recipientId = Number(data?.recipientId)
        const text = typeof data?.text === 'string' ? data.text.trim() : ''
        if (!Number.isSafeInteger(recipientId) || recipientId < 1
          || !text || text.length > 2000) {
          return respond({ success: false, message: 'A valid recipient and message of 1-2000 characters are required.' })
        }

        const recipient = await findRecord('users', recipientId)
        if (!recipient) return respond({ success: false, message: 'Recipient not found.' })

        let recipientStudent = null
        if (String(recipient.role) === '3') {
          recipientStudent = (await listRecords('students'))
            .find((profile) => String(profile.user_id) === String(recipient.id)) || null
          if (!recipientStudent || recipientStudent.blacklisted === 'Y' || recipientStudent.blacklisted === true) {
            return respond({ success: false, message: 'Recipient is unavailable.' })
          }
        }

        const message = await createRecord('messages', {
          sender_id: sender.id,
          recipient_id: recipientId,
          text,
          created_at: new Date().toISOString(),
        })
        io.to(`user:${sender.id}`).to(`user:${recipientId}`).emit('receive_message', message)

        let notificationCreated = true
        if (recipientStudent) {
          try {
            const notification = await createRecord('notifications', {
              student_id: recipientStudent.id,
              title: 'New message',
              message: `You have a new message from ${sender.name}.`,
              is_read: false,
              created_at: new Date().toISOString(),
            })
            io.to(`user:${recipientId}`).emit('new_notification', notification)
          } catch (error) {
            notificationCreated = false
            console.error('Unable to persist message notification:', error)
          }
        }

        return respond({
          success: true,
          message,
          notificationCreated,
        })
      } catch (error) {
        console.error('Unable to send socket message:', error)
        return respond({ success: false, message: 'Unable to send message. Please try again.' })
      }
    })
  })

  return io
}
