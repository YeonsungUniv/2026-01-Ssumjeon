-- username 컬럼 추가 (아이디, 로그인 식별자)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- email 선택 항목으로 변경 (username으로 로그인)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- 계정 상태 (pending/approved/rejected)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
UPDATE users SET status = 'approved';

-- 재학증명서 파일 경로
ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_doc TEXT;

-- 관리자 플래그
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
