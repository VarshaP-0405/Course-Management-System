module.exports = (request, response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return next()
  }

  return response.status(405).json({
    message: 'This endpoint is a read-only mirror. Use the admin database page for changes.',
  })
}