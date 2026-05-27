-- student_id를 선택 항목으로 변경 (username 기반 로그인으로 전환됨)
ALTER TABLE users ALTER COLUMN student_id DROP NOT NULL;
