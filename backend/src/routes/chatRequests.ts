import { Router } from 'express'
import { chatRequestController } from '../controllers/chatRequestController'
import { authenticate } from '../middlewares/auth'

const router = Router()
router.use(authenticate)

router.get('/browse', chatRequestController.browse)
router.get('/incoming', chatRequestController.getIncoming)
router.get('/outgoing', chatRequestController.getOutgoing)
router.get('/pending-count', chatRequestController.getPendingCount)
router.post('/', chatRequestController.sendRequest)
router.patch('/:requestId/respond', chatRequestController.respond)
router.delete('/:requestId/sent', chatRequestController.deleteSent)
router.delete('/:requestId', chatRequestController.cancel)

export default router
