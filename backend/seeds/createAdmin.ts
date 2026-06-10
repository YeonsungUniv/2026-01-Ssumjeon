// 관리자 계정 생성/승격 (현재 .env가 가리키는 DB 기준)
// 사용법:
//   새 관리자 생성:        npx ts-node seeds/createAdmin.ts <아이디> <비밀번호> [닉네임]
//   기존 계정 관리자 승격:  이미 있는 아이디를 넣으면 is_admin=true 로 승격
import '../src/config/env'
import { pool } from '../src/config/db'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'

async function main() {
  const [username, password, nickname] = process.argv.slice(2)
  if (!username || !password) {
    console.error('사용법: npx ts-node seeds/createAdmin.ts <아이디> <비밀번호> [닉네임]')
    process.exit(1)
  }

  const exist = await pool.query('SELECT id FROM users WHERE username = $1', [username])
  if (exist.rows.length > 0) {
    await pool.query(`UPDATE users SET is_admin = true, status = 'approved' WHERE username = $1`, [username])
    console.log(`✅ 기존 계정 '${username}' 을(를) 관리자로 승격했습니다.`)
  } else {
    const hash = await bcrypt.hash(password, 12)
    const nick = (nickname ?? '관리자').slice(0, 7)
    await pool.query(
      `INSERT INTO users (id, username, password_hash, nickname, gender, department, grade, interests, status, is_verified, is_admin)
       VALUES ($1, $2, $3, $4, 'male', '관리자', 1, '{}', 'approved', true, true)`,
      [uuid(), username, hash, nick],
    )
    console.log(`✅ 관리자 계정 '${username}' 을(를) 생성했습니다. (닉네임: ${nick})`)
  }

  console.log(`연결 DB: ${process.env.DB_HOST} / ${process.env.DB_NAME}`)
  await pool.end()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
