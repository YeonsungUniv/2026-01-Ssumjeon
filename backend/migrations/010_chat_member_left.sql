-- 1:1 채팅방 나가기 시 멤버를 삭제하지 않고 '나간 시각'만 기록 (상대방 프로필/내역 보존)
ALTER TABLE chat_room_members
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
