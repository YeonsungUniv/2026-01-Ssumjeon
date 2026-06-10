import { describe, it, expect } from 'vitest'
import {
  isPastDateTime,
  isUrlContent,
  validateMessageContent,
  previewLastMessage,
} from './validation'

describe('isPastDateTime', () => {
  const now = new Date('2026-06-10T12:00:00').getTime()

  it('과거 날짜는 true', () => {
    expect(isPastDateTime('2020-01-01', '10:00', now)).toBe(true)
  })
  it('미래 날짜는 false', () => {
    expect(isPastDateTime('2030-01-01', '10:00', now)).toBe(false)
  })
  it('오늘 이후 시간은 false', () => {
    expect(isPastDateTime('2026-06-10', '18:00', now)).toBe(false)
  })
  it('오늘 이미 지난 시간은 true', () => {
    expect(isPastDateTime('2026-06-10', '08:00', now)).toBe(true)
  })
  it('잘못된 형식은 false (다른 검증에서 처리)', () => {
    expect(isPastDateTime('not-a-date', '10:00', now)).toBe(false)
  })
})

describe('isUrlContent', () => {
  it('http/s3/uploads는 URL로 인식', () => {
    expect(isUrlContent('https://x.s3.amazonaws.com/chat/a.png')).toBe(true)
    expect(isUrlContent('/uploads/profiles/a.png')).toBe(true)
  })
  it('일반 텍스트는 URL 아님', () => {
    expect(isUrlContent('안녕하세요')).toBe(false)
  })
})

describe('validateMessageContent', () => {
  it('빈 메시지는 에러', () => {
    expect(validateMessageContent('   ')).toBe('메시지를 입력해주세요.')
  })
  it('2000자 초과는 에러', () => {
    expect(validateMessageContent('a'.repeat(2001))).toBe('메시지는 2000자 이하로 입력해주세요.')
  })
  it('정상 텍스트는 null', () => {
    expect(validateMessageContent('반가워요!')).toBeNull()
  })
  it('이미지 URL은 길이검증 제외 → null', () => {
    expect(validateMessageContent('https://x.amazonaws.com/chat/' + 'a'.repeat(3000))).toBeNull()
  })
})

describe('previewLastMessage', () => {
  it('시스템/약속 마커 변환', () => {
    expect(previewLastMessage('[system:partner_left]')).toBe('상대방이 채팅방을 나갔습니다')
    expect(previewLastMessage('[appointment:proposed]')).toBe('📅 약속을 제안했어요')
    expect(previewLastMessage('[appointment:cancelled]')).toBe('📅 약속이 취소되었어요')
    expect(previewLastMessage('[expired_image]')).toBe('🗑️ 만료된 이미지')
  })
  it('이미지 URL은 사진 안내로', () => {
    expect(previewLastMessage('/uploads/chat/a.png')).toBe('📷 사진을 보냈습니다')
  })
  it('일반 텍스트는 그대로', () => {
    expect(previewLastMessage('밥 먹었어?')).toBe('밥 먹었어?')
  })
  it('null은 null', () => {
    expect(previewLastMessage(null)).toBeNull()
  })
})
