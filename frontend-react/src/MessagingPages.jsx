import { useEffect, useRef, useState } from 'react'
import { request } from './api.js'
import { useApp } from './useApp.js'
import { createSocket } from './socketClient.js'

function PageShell({ title, subtitle, children }) {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Course Management</p>
          <h1>{title}</h1>
        </div>
        <p className="subtitle">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

export function MessagesPage() {
  const { session } = useApp()
  const [recipientId, setRecipientId] = useState('')
  const [activeRecipientId, setActiveRecipientId] = useState('')
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const socketRef = useRef(null)
  const activeRecipientRef = useRef('')

  useEffect(() => {
    activeRecipientRef.current = activeRecipientId
  }, [activeRecipientId])

  useEffect(() => {
    if (!session?.token) return undefined

    const socket = createSocket(session.token)
    socketRef.current = socket
    socket.on('connect', () => {
      setConnected(true)
      setError('')
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', (connectError) => {
      setConnected(false)
      setError(connectError.message)
    })
    socket.on('receive_message', (incoming) => {
      const peerId = activeRecipientRef.current
      if (!peerId) return
      const isConversationMessage = (
        String(incoming.sender_id) === String(peerId)
          && String(incoming.recipient_id) === String(session.userId)
      ) || (
        String(incoming.sender_id) === String(session.userId)
          && String(incoming.recipient_id) === String(peerId)
      )
      if (!isConversationMessage) return
      setMessages((current) => current.some((item) => String(item.id) === String(incoming.id))
        ? current
        : [...current, incoming])
    })
    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [session?.token, session?.userId])

  const loadHistory = async (event) => {
    event.preventDefault()
    const id = Number(recipientId)
    if (!Number.isSafeInteger(id) || id < 1 || id === Number(session?.userId)) {
      setError('Enter another account\'s positive user ID.')
      return
    }

    setError('')
    setStatus('')
    setMessages([])
    try {
      const result = await request(`api/messages/${id}`)
      setMessages(result.messages)
      setActiveRecipientId(String(id))
      activeRecipientRef.current = String(id)
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  const sendMessage = (event) => {
    event.preventDefault()
    const socket = socketRef.current
    if (!socket?.connected || !activeRecipientId) {
      setError('Connect and load a conversation before sending a message.')
      return
    }

    setError('')
    setStatus('')
    socket.emit('send_message', {
      recipientId: activeRecipientId,
      text: message,
    }, (result) => {
      if (!result.success) {
        setError(result.message)
        return
      }
      setMessage('')
      setStatus(result.notificationCreated
        ? 'Message sent.'
        : 'Message sent, but its notification could not be saved.')
    })
  }

  return (
    <PageShell title="Messages" subtitle="Send direct messages to another CourseHub account.">
      <section className="chat-card">
        <p role="status">Connection: {connected ? 'Online' : 'Offline'}</p>
        <p>Your user ID: <strong>{session?.userId}</strong></p>
        <form className="chat-form" onSubmit={loadHistory}>
          <label>
            Recipient user ID
            <input
              type="number"
              min="1"
              value={recipientId}
              onChange={(event) => {
                setRecipientId(event.target.value)
                setActiveRecipientId('')
                activeRecipientRef.current = ''
                setMessages([])
              }}
              required
            />
          </label>
          <button className="btn secondary" type="submit">Load conversation</button>
        </form>
        {error ? <p className="form-message error" role="alert">{error}</p> : null}
        {status ? <p className="form-message success" role="status">{status}</p> : null}
        <div className="chat-history" aria-live="polite">
          {messages.map((item) => (
            <article className="chat-message" key={item.id}>
              <strong>{String(item.sender_id) === String(session?.userId) ? 'You' : `User ${item.sender_id}`}</strong>
              <p>{item.text}</p>
              <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
            </article>
          ))}
          {!messages.length ? <p className="empty-state">Load a conversation to view its messages.</p> : null}
        </div>
        <form className="chat-form" onSubmit={sendMessage}>
          <label>
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              rows={3}
              required
            />
          </label>
          <button className="btn primary" type="submit" disabled={!connected || !activeRecipientId}>
            Send message
          </button>
        </form>
      </section>
    </PageShell>
  )
}

export function NotificationsPage() {
  const { session } = useApp()
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const socket = createSocket(session?.token)
    request('api/notifications')
      .then((result) => {
        if (active) setNotifications(Array.isArray(result) ? result : result.notifications)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })

    socket.on('new_notification', (notification) => {
      setNotifications((current) => current.some((item) => String(item.id) === String(notification.id))
        ? current
        : [notification, ...current])
    })
    socket.on('connect_error', (connectError) => {
      if (active) setError(connectError.message)
    })
    socket.connect()

    return () => {
      active = false
      socket.disconnect()
    }
  }, [session?.token])

  const markRead = async (id) => {
    setError('')
    try {
      const result = await request(`api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications((current) => current.map((item) => (
        String(item.id) === String(id) ? result.notification : item
      )))
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  return (
    <PageShell title="Notifications" subtitle="Recent updates from your courses and instructors.">
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
      <div className="notification-list">
        {notifications.length ? notifications.map((item) => (
          <div key={item.id} className="notification-item">
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <span>{item.is_read ? 'Read' : 'New'}</span>
            {!item.is_read ? (
              <button className="btn secondary small" type="button" onClick={() => markRead(item.id)}>
                Mark as read
              </button>
            ) : null}
          </div>
        )) : <div className="empty-state">No notifications available.</div>}
      </div>
    </PageShell>
  )
}
