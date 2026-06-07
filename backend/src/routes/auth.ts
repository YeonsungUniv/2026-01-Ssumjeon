import { Router } from 'express'
import { authController } from '../controllers/authController'

const router = Router()

router.post('/send-email-code', authController.sendEmailCode)
router.post('/verify-email-code', authController.verifyEmailCode)
router.post('/send-recovery-code', authController.sendRecoveryCode)
router.post('/find-username', authController.findUsername)
router.post('/reset-password', authController.resetPassword)
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/check-username/:username', authController.checkUsername)

export default router
