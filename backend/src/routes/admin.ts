import { Router } from 'express'
import { adminController } from '../controllers/adminController'
import { authenticate } from '../middlewares/auth'
import { adminOnly } from '../middlewares/adminOnly'

const router = Router()

router.use(authenticate, adminOnly)

router.get('/users', adminController.listUsers)
router.patch('/users/:userId', adminController.updateUser)

router.get('/pending', adminController.listPending)
router.patch('/users/:userId/approve', adminController.approveUser)
router.patch('/users/:userId/reject', adminController.rejectUser)

router.get('/support', adminController.listInquiries)
router.patch('/support/:id/answer', adminController.answerInquiry)

export default router
