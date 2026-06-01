import { Router } from 'express'
import authRouter from './auth'
import userRouter from './users'
import matchingRouter from './matching'
import groupMatchingRouter from './groupMatching'
import chatRouter from './chat'
import supportRouter from './support'
import appointmentRouter from './appointments'
import adminRouter from './admin'
import chatRequestRouter from './chatRequests'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/matching', matchingRouter)
router.use('/group-matching', groupMatchingRouter)
router.use('/chat', chatRouter)
router.use('/support', supportRouter)
router.use('/appointments', appointmentRouter)
router.use('/admin', adminRouter)
router.use('/chat-requests', chatRequestRouter)

export default router
