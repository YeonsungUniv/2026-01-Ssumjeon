import { Router } from 'express'
import { authController } from '../controllers/authController'
import { authLimiter, emailLimiter } from '../middlewares/rateLimit'

const router = Router()

router.post('/send-email-code', emailLimiter, authController.sendEmailCode)
router.post('/verify-email-code', authLimiter, authController.verifyEmailCode)
router.post('/send-recovery-code', emailLimiter, authController.sendRecoveryCode)
router.post('/find-username', authLimiter, authController.findUsername)
router.post('/reset-password', authLimiter, authController.resetPassword)
router.post('/register', authController.register)
router.post('/login', authLimiter, authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/check-username/:username', authController.checkUsername)

export default router
