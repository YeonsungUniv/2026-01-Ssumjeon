-- 과팅 매칭 신청 (상대 팀장이 수락해야 매칭 성사)
CREATE TABLE IF NOT EXISTS group_match_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_room_id  UUID NOT NULL REFERENCES group_rooms(id) ON DELETE CASCADE,
  to_room_id    UUID NOT NULL REFERENCES group_rooms(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_room_id, to_room_id)
);

CREATE INDEX IF NOT EXISTS idx_gmr_to   ON group_match_requests(to_room_id);
CREATE INDEX IF NOT EXISTS idx_gmr_from ON group_match_requests(from_room_id);
