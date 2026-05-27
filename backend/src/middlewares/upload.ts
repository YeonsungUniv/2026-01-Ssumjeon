import multer from 'multer'
import path from 'path'
import fs from 'fs'

function makeStorage(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  })
}

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
  storage: makeStorage(path.join(__dirname, '../../uploads/profiles')),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image')

export const uploadEnrollment = multer({
  storage: makeStorage(path.join(__dirname, '../../uploads/enrollments')),
  fileFilter: docFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('enrollmentDoc')

export const uploadChatImage = multer({
  storage: makeStorage(path.join(__dirname, '../../uploads/chat')),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('image')
