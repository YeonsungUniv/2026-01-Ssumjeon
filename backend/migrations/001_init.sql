-- ── Extensions ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(100) UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  nickname       VARCHAR(20) UNIQUE NOT NULL,
  student_id     VARCHAR(20) NOT NULL,
  department     VARCHAR(50) NOT NULL,
  grade          SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 4),
  gender         VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  profile_image  TEXT,
  bio            VARCHAR(200),
  mbti           VARCHAR(4),
  interests      TEXT[] DEFAULT '{}',
  is_verified    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Refresh Tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Swipes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swipes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      VARCHAR(10) NOT NULL CHECK (action IN ('like', 'pass')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (swiper_id, target_id)
);

-- ── Matches ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) DEFAULT 'matched' CHECK (status IN ('pending', 'matched')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

-- ── Group Rooms ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_rooms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             VARCHAR(100) NOT NULL,
  description       TEXT,
  leader_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gender            VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  max_members       SMALLINT NOT NULL DEFAULT 3 CHECK (max_members BETWEEN 2 AND 10),
  preferred_gender  VARCHAR(10) NOT NULL CHECK (preferred_gender IN ('male', 'female')),
  status            VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'closed')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_room_members (
  group_room_id  UUID NOT NULL REFERENCES group_rooms(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_leader      BOOLEAN DEFAULT FALSE,
  joined_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_room_id, user_id)
);

-- ── Chat Rooms ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type           VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'group')),
  group_room_id  UUID REFERENCES group_rooms(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
  chat_room_id  UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_room_id, user_id)
);

-- ── Messages ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_swipes_swiper    ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target    ON swipes(target_id);
CREATE INDEX IF NOT EXISTS idx_matches_users    ON matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_room    ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender  ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens   ON refresh_tokens(token);
