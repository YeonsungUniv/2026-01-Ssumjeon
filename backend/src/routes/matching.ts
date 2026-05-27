import { Router } from 'express'
import { matchingController } from '../controllers/matchingController'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)

router.get('/departments', matchingController.getDepartments)
router.get('/cards', matchingController.getCards)
router.post('/swipe', matchingController.swipe)
router.get('/matches', matchingController.getMatches)

export default router
