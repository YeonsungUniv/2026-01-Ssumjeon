import multer from 'multer'
import path from 'path'

const memory = multer.memoryStorage()

const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('jpg/png/webp 파일만 업로드 가능합니다.'))
}

const docFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf']
  const ext = path.extname(file.originalname).toLowerCase()
  allowed.includes(ext) ? cb(null, true) : cb(new Error('jpg/png/pdf 파일만 업로드 가능합니다.'))
}

export const uploadProfile = multer({
  storage: memory,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image')

export const uploadEnrollment = multer({
  storage: memory,
  fileFilter: docFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('enrollmentDoc')

export const uploadChatImage = multer({
  storage: memory,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('image')
