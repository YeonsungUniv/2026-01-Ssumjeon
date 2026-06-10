import rateLimit from 'express-rate-limit'

const json = (message: string) => ({ success: false, data: null, message })

// 전체 API 기본 제한 (IP 기준)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'),
})

// 인증 민감 엔드포인트 (로그인·이메일 코드·계정찾기) — 무차별 대입/스팸 방지
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10분
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('인증 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'),
})

// 이메일 발송 — 메일 폭탄 방지 (더 엄격)
export const emailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10분
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('인증 메일 발송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'),
})
