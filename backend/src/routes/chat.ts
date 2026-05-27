import { Router } from 'express'
import { chatController } from '../controllers/chatController'
import { authenticate } from '../middlewares/auth'
import { uploadChatImage } from '../middlewares/upload'

const router = Router()

router.use(authenticate)

router.get('/rooms', chatController.getRooms)
router.get('/rooms/:roomId/messages', chatController.getMessages)
router.post('/rooms/:roomId/messages', chatController.sendMessage)
router.post('/rooms/:roomId/image', uploadChatImage, chatController.sendImage)
router.patch('/rooms/:roomId/read', chatController.markAsRead)
router.get('/rooms/:roomId/info', chatController.getRoomInfo)
router.patch('/rooms/:roomId/name', chatController.updateRoomName)
router.delete('/rooms/:roomId/leave', chatController.leaveRoom)
router.get('/blocked', chatController.getBlockedUsers)
router.post('/block/:userId', chatController.blockUser)
router.delete('/block/:userId', chatController.unblockUser)

export default router
