import { Router } from 'express'
import { supportController } from '../controllers/supportController'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.post('/', supportController.submit)
router.get('/', supportController.getMyInquiries)
router.get('/:id', supportController.getInquiry)

export default router
