CREATE TABLE IF NOT EXISTS email_verification_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      VARCHAR(100) NOT NULL,
  code       CHAR(6) NOT NULL,
  verified   BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_codes_lookup ON email_verification_codes(email, verified, expires_at);
