// 가입 계정 조회 (현재 .env가 가리키는 DB 기준)
// 사용법:
//   전체:        npx ts-node seeds/listUsers.ts
//   검색(부분):  npx ts-node seeds/listUsers.ts doguy724      ← 이메일/아이디/닉네임에 포함되면 표시
import '../src/config/env'
import { pool } from '../src/config/db'

async function main() {
  const q = (process.argv[2] ?? '').trim().toLowerCase()
  const where = q
    ? `WHERE LOWER(email) LIKE $1 OR LOWER(username) LIKE $1 OR LOWER(nickname) LIKE $1 OR student_id LIKE $1`
    : ''
  const params = q ? [`%${q}%`] : []

  const r = await pool.query(
    `SELECT username, nickname, email, student_id, department, gender, status,
            to_char(created_at,'YYYY-MM-DD HH24:MI') AS joined
     FROM users ${where} ORDER BY created_at`,
    params,
  )

  console.log(`연결 DB: ${process.env.DB_HOST} / ${process.env.DB_NAME}`)
  console.log(q ? `"${q}" 검색 결과: ${r.rowCount}건\n` : `전체: ${r.rowCount}명\n`)
  console.table(r.rows.map((u: any) => ({
    아이디: u.username, 닉네임: u.nickname, 이메일: u.email,
    학번: u.student_id, 학과: u.department,
    성별: u.gender === 'male' ? '남' : '여', 상태: u.status, 가입: u.joined,
  })))
  await pool.end()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
