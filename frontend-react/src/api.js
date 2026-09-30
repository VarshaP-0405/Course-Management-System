const API_BASE = import.meta.env.VITE_API_BASE || '/mock-api'

export async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}/${path.replace(/^\//, '')}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('The backend is unavailable. Start it with `cd backend && npm install && npm start`.')
  }

  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`)
  }
  return data
}

export const getCollection = (name) => request(name)