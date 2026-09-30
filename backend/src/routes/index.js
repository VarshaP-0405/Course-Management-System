import { Router } from 'express'
import { login } from '../controllers/authController.js'
import { getCollection, getRecord, patchRecord, postRecord, removeRecord } from '../controllers/collectionController.js'
import { getHealth, getHome } from '../controllers/systemController.js'

const router = Router()

router.get('/', getHome)
router.get('/api/health', getHealth)
router.post('/api/auth/login', login)
router.get('/:collection', getCollection)
router.post('/:collection', postRecord)
router.get('/:collection/:id', getRecord)
router.patch('/:collection/:id', patchRecord)
router.put('/:collection/:id', patchRecord)
router.delete('/:collection/:id', removeRecord)

export default router
