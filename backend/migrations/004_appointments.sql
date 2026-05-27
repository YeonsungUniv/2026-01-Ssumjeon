CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id      UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  proposer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  time         TIME NOT NULL,
  location     VARCHAR(100) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id, created_at DESC);
