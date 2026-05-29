ALTER TABLE group_rooms ADD COLUMN IF NOT EXISTS room_password VARCHAR(4);
ALTER TABLE group_rooms ADD COLUMN IF NOT EXISTS allowed_gender VARCHAR(10) CHECK (allowed_gender IN ('male', 'female'));
