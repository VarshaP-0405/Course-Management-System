import {
  findRecord,
  listConversationMessages,
  listNotifications as queryNotifications,
  updateRecord,
} from '../services/databaseService.js'

function parseUserId(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function getConversation(request, response, next) {
  const currentUserId = parseUserId(request.user.id)
  const otherUserId = parseUserId(request.params.userId)
  if (!currentUserId || !otherUserId) {
    return response.status(400).json({ message: 'User IDs must be positive integers.' })
  }

  try {
    const user = await findRecord('users', otherUserId)
    if (!user) return response.status(404).json({ message: 'User not found.' })

    const messages = await listConversationMessages(currentUserId, otherUserId)
    return response.json({ messages })
  } catch (error) {
    return next(error)
  }
}

export async function getNotifications(request, response, next) {
  try {
    let notifications
    if (request.user.role === '3') {
      if (!request.studentId) {
        return response.status(403).json({ message: 'No student profile is linked to this account.' })
      }
      notifications = await queryNotifications(request.studentId)
    } else {
      notifications = await queryNotifications()
    }
    return response.json(notifications)
  } catch (error) {
    return next(error)
  }
}

export async function markNotificationRead(request, response, next) {
  if (request.user.role !== '3' || !request.studentId) {
    return response.status(403).json({ message: 'Only students can update their own notifications.' })
  }

  const notificationId = parseUserId(request.params.id)
  if (!notificationId) return response.status(400).json({ message: 'Notification ID must be a positive integer.' })

  try {
    const notification = await findRecord('notifications', notificationId)
    if (!notification || String(notification.student_id) !== request.studentId) {
      return response.status(404).json({ message: 'Notification not found.' })
    }
    const updated = await updateRecord('notifications', notificationId, { is_read: true })
    return response.json({ notification: updated })
  } catch (error) {
    return next(error)
  }
}
