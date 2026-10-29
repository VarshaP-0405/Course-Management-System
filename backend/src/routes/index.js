import { Router } from 'express'
import { getCurrentUser, login, register } from '../controllers/authController.js'
import { completeCourseModule, getCollection, getMyCourses, getRecord, patchRecord, postRecord, putRecord, removeRecord, unenrollCourse } from '../controllers/collectionController.js'
import { authenticate, authorizeCollection } from '../middleware/authentication.js'
import { loginLimiter } from '../middleware/loginLimiter.js'
import { listRecords } from '../services/databaseService.js'
import { getHealth, getHome } from '../controllers/systemController.js'
import { getConversation, getNotifications, markNotificationRead } from '../controllers/messageController.js'

const router = Router()
const collectionRoutes = Router()

router.get('/', getHome)
router.get('/api/health', getHealth)
router.post('/api/auth/register', register)
router.post('/api/v1/auth/register', register)
router.post('/api/auth/login', loginLimiter, login)
router.post('/api/v1/auth/login', loginLimiter, login)
router.get('/api/auth/me', authenticate, getCurrentUser)
router.get('/api/v1/auth/me', authenticate, getCurrentUser)
router.get(['/api/messages/:userId', '/api/v1/messages/:userId'], authenticate, getConversation)
router.get(['/api/notifications', '/api/v1/notifications'], authenticate, attachStudentProfile, getNotifications)
router.patch(
  ['/api/notifications/:id/read', '/api/v1/notifications/:id/read'],
  authenticate,
  attachStudentProfile,
  markNotificationRead,
)
router.post('/api/learning/courses/:courseId/modules/:moduleId/complete', authenticate, attachStudentProfile, completeCourseModule)
router.post('/api/v1/learning/courses/:courseId/modules/:moduleId/complete', authenticate, attachStudentProfile, completeCourseModule)
router.get('/api/enrollments/my-courses', authenticate, attachStudentProfile, getMyCourses)
router.get('/api/v1/enrollments/my-courses', authenticate, attachStudentProfile, getMyCourses)
router.delete('/api/enrollments/:courseId', authenticate, attachStudentProfile, unenrollCourse)
router.delete('/api/v1/enrollments/:courseId', authenticate, attachStudentProfile, unenrollCourse)

collectionRoutes.use('/:collection', authenticate, attachStudentProfile, authorizeCollection)

async function attachStudentProfile(request, response, next) {
  if (request.user.role !== '3') return next()

  try {
    const students = await listRecords('students')
    const student = students.find((record) => String(record.user_id) === request.user.id)
    if (!student) return response.status(403).json({ message: 'No student profile is linked to this account.' })
    request.studentId = String(student.id)
    return next()
  } catch (error) {
    return next(error)
  }
}

router.get('/api/:collection(courses|modules)', getCollection)
router.get('/api/:collection(courses|modules)/:id', getRecord)
router.get('/api/v1/:collection(courses|modules)', getCollection)
router.get('/api/v1/:collection(courses|modules)/:id', getRecord)
router.get('/:collection(courses|modules)', getCollection)
router.get('/:collection(courses|modules)/:id', getRecord)

collectionRoutes.get('/:collection', getCollection)
collectionRoutes.post('/:collection', postRecord)
collectionRoutes.get('/:collection/:id', getRecord)
collectionRoutes.patch('/:collection/:id', patchRecord)
collectionRoutes.put('/:collection/:id', putRecord)
collectionRoutes.delete('/:collection/:id', removeRecord)

router.use('/api/v1', collectionRoutes)
router.use('/api', collectionRoutes)
router.use('/', collectionRoutes)

export default router
