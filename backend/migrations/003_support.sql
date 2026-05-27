CREATE TABLE IF NOT EXISTS support_inquiries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    VARCHAR(30) NOT NULL,
  title       VARCHAR(100) NOT NULL,
  content     TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  answer      TEXT,
  answered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_user ON support_inquiries(user_id, created_at DESC);
