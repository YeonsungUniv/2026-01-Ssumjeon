// 외부 의존성 없는 순수 검증 유틸 (단위 테스트 대상)

/** 과거 일시 여부 (서버 TZ 기준, 2분 여유). 명백한 과거면 true */
export function isPastDateTime(date: string, time: string, now: number = Date.now()): boolean {
  const dt = new Date(`${date}T${(time || '23:59')}:00`)
  if (isNaN(dt.getTime())) return false
  return dt.getTime() < now - 2 * 60 * 1000
}

/** 채팅 이미지/URL 콘텐츠 여부 (길이 검증 제외 대상) */
export function isUrlContent(content: string): boolean {
  return /^https?:\/\//.test(content) || content.includes('amazonaws.com') || content.startsWith('/uploads/')
}

/** 텍스트 메시지 검증 — 문제 시 에러 메시지, 정상이면 null */
export function validateMessageContent(content: string): string | null {
  if (isUrlContent(content)) return null
  const text = (content ?? '').trim()
  if (text.length === 0) return '메시지를 입력해주세요.'
  if (text.length > 2000) return '메시지는 2000자 이하로 입력해주세요.'
  return null
}

/** 채팅 목록 미리보기 텍스트 변환 */
export function previewLastMessage(content: string | null): string | null {
  if (!content) return null
  if (content === '[system:partner_left]') return '상대방이 채팅방을 나갔습니다'
  if (content === '[appointment:proposed]') return '📅 약속을 제안했어요'
  if (content === '[appointment:cancelled]') return '📅 약속이 취소되었어요'
  if (content === '[expired_image]') return '🗑️ 만료된 이미지'
  if (content.includes('amazonaws.com') || content.startsWith('/uploads/')) return '📷 사진을 보냈습니다'
  return content
}
