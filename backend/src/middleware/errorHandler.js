export function notFound(_request, response) {
  response.status(404).json({ message: 'Route not found.' })
}

export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || (error.type === 'entity.parse.failed' ? 400 : 500)
  if (statusCode >= 500) console.error(error)
  response.status(statusCode).json({ message: statusCode === 500 ? 'Internal server error.' : error.message })
}
