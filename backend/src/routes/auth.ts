import { Router } from 'express'
import { authController } from '../controllers/authController'
import { uploadEnrollment } from '../middlewares/upload'

const router = Router()

router.post('/register', uploadEnrollment, authController.register)
router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)

export default router
