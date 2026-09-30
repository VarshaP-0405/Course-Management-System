export function getHome(_request, response) {
  response.json({ status: 'ok', message: 'Course Management backend is running.' })
}

export function getHealth(_request, response) {
  response.json({ status: 'ok', service: 'course-management-api', timestamp: new Date().toISOString() })
}
