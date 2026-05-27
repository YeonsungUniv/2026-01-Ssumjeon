import { Router } from 'express'
import { groupMatchingController } from '../controllers/groupMatchingController'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)

router.get('/rooms', groupMatchingController.getRooms)
router.post('/rooms', groupMatchingController.createRoom)
router.get('/my-room', groupMatchingController.getMyRoom)
router.post('/rooms/:roomId/join', groupMatchingController.joinRoom)
router.post('/rooms/:roomId/leave', groupMatchingController.leaveRoom)
router.delete('/rooms/:roomId', groupMatchingController.disbandRoom)
router.delete('/rooms/:roomId/match', groupMatchingController.cancelMatch)
router.post('/rooms/join-by-code', groupMatchingController.joinByCode)
router.post('/rooms/:roomId/invite', groupMatchingController.inviteUser)
router.post('/rooms/:roomId/match', groupMatchingController.requestMatch)

export default router
