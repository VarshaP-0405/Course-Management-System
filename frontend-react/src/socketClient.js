import { io } from 'socket.io-client'

export function createSocket(token) {
  const url = import.meta.env.VITE_SOCKET_URL || undefined
  return io(url, {
    autoConnect: false,
    auth: { token },
  })
}
