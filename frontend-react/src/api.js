const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '/mock-api')
  .replace(/\/+$/, '')

function getApiUrl(apiPath) {
  if (API_BASE.endsWith('/api/v1') && apiPath.startsWith('api/')) {
    return `${API_BASE}/${apiPath.replace(/^api(?:\/v1)?\/?/, '')}`
  }
  return `${API_BASE}/${apiPath}`
}

export async function request(path, options = {}) {
  const endpoint = path.replace(/^\//, '')
  const apiPath = endpoint.startsWith('api/') ? endpoint : `api/${endpoint}`
  let token
  try {
    token = JSON.parse(localStorage.getItem('cms_session') || 'null')?.token
  } catch {
    localStorage.removeItem('cms_session')
  }
  let response
  try {
    response = await fetch(getApiUrl(apiPath), {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('The backend is unavailable. Start it with `cd backend && npm install && npm start`.')
  }

  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`)
    error.status = response.status
    if (response.status === 401 && token) {
      localStorage.removeItem('cms_session')
      window.dispatchEvent(new Event('cms:unauthorized'))
    }
    throw error
  }
  return data
}

export const getCollection = (name) => request(name)