import { Router } from 'express'
import { appointmentController } from '../controllers/appointmentController'
import { authenticate } from '../middlewares/auth'

const router = Router()
router.use(authenticate)

router.get('/mine', appointmentController.getMine)
router.get('/rooms/:roomId', appointmentController.getByRoom)
router.post('/rooms/:roomId', appointmentController.propose)
router.put('/:id', appointmentController.edit)
router.patch('/:id', appointmentController.updateStatus)

export default router
