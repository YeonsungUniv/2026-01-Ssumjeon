import { Router } from 'express'
import { userController } from '../controllers/userController'
import { authenticate } from '../middlewares/auth'
import { uploadProfile } from '../middlewares/upload'

const router = Router()

router.get('/search', authenticate, userController.searchUsers)
router.get('/me', authenticate, userController.getMe)
router.patch('/me', authenticate, userController.updateMe)
router.patch('/me/password', authenticate, userController.changePassword)
router.post('/me/profile-image', authenticate, uploadProfile, userController.uploadProfileImage)
router.delete('/me', authenticate, userController.deleteMe)
router.get('/:userId', authenticate, userController.getUser)

export default router
