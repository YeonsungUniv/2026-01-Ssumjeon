-- ── Chat Requests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver ON chat_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender   ON chat_requests(sender_id);
