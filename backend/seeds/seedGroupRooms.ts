// 과팅방 테스트 데이터 생성 (방장 유저 + 대기중 과팅방)
// 사용법: npx ts-node seeds/seedGroupRooms.ts
import '../src/config/env'
import { pool } from '../src/config/db'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'

type G = 'male' | 'female'

const ROOMS: { title: string; desc: string; gender: G; max: number; nick: string; dept: string; sid: string }[] = [
  { title: '치맥 한잔 하실 분 🍗',   desc: '학교 앞에서 가볍게 치맥해요',   gender: 'male',   max: 4, nick: '민준',   dept: '컴퓨터소프트웨어과', sid: '20240101' },
  { title: '주말 보드게임 과팅 🎲',  desc: '보드게임 카페에서 만나요',     gender: 'female', max: 3, nick: '서연',   dept: '경영과',           sid: '20230102' },
  { title: '노래방 같이 가실 분~ 🎤', desc: '노래 좋아하는 사람 환영',       gender: 'male',   max: 4, nick: '도현',   dept: '전기과',           sid: '20250103' },
  { title: '한강 피크닉 과팅 🧺',    desc: '날 좋을 때 한강 가요',         gender: 'female', max: 4, nick: '지우',   dept: '건축과',           sid: '20240104' },
  { title: '카페 투어 같이해요 ☕',   desc: '예쁜 카페 돌아다녀요',         gender: 'male',   max: 2, nick: '준서',   dept: '실내건축과',        sid: '20230105' },
  { title: '방탈출 도전팀 🔓',       desc: '방탈출 잘하는 분 구해요',      gender: 'female', max: 3, nick: '하은',   dept: '컴퓨터소프트웨어과', sid: '20250106' },
  { title: '맛집 탐방 모임 🍜',      desc: '맛집 같이 다녀요',            gender: 'male',   max: 4, nick: '시우',   dept: '경영과',           sid: '20240107' },
  { title: '영화 보고 저녁 🎬',      desc: '영화 + 저녁 콜?',             gender: 'female', max: 2, nick: '예린',   dept: '전기과',           sid: '20230108' },
  { title: '볼링 한 게임 어때요 🎳',  desc: '볼링 초보도 환영!',           gender: 'male',   max: 3, nick: '우진',   dept: '건축과',           sid: '20250109' },
  { title: '캠퍼스 커플 매칭 ✨',    desc: '편하게 친구처럼 만나요',       gender: 'female', max: 4, nick: '수아',   dept: '실내건축과',        sid: '20240110' },
]

async function main() {
  const passwordHash = await bcrypt.hash('test1234!', 10)
  let created = 0

  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i]

    // 같은 제목의 대기방이 이미 있으면 건너뜀 (중복 실행 방지)
    const exists = await pool.query("SELECT 1 FROM group_rooms WHERE title = $1 AND status = 'waiting'", [r.title])
    if (exists.rows.length > 0) continue

    const grade = Math.min(Math.max(new Date().getFullYear() - parseInt(r.sid.slice(0, 4), 10) + 1, 1), 4)
    const username = `gl_${r.sid}`

    // 방장 유저 (없으면 생성)
    let leaderId: string
    const found = await pool.query('SELECT id FROM users WHERE username = $1', [username])
    if (found.rows.length > 0) {
      leaderId = found.rows[0].id
    } else {
      leaderId = uuid()
      await pool.query(
        `INSERT INTO users (id, username, password_hash, nickname, student_id, gender, department, grade, interests, status, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}','approved',true)`,
        [leaderId, username, passwordHash, r.nick, r.sid, r.gender, r.dept, grade],
      )
    }

    // 과팅방 생성 (공개, 대기중, preferred_gender = 반대 성별)
    const roomId = uuid()
    const preferred: G = r.gender === 'male' ? 'female' : 'male'
    await pool.query(
      `INSERT INTO group_rooms (id, title, description, leader_id, gender, max_members, preferred_gender, is_private)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
      [roomId, r.title, r.desc, leaderId, r.gender, r.max, preferred],
    )
    await pool.query(
      'INSERT INTO group_room_members (group_room_id, user_id, is_leader) VALUES ($1,$2,true)',
      [roomId, leaderId],
    )
    created++
  }

  const total = await pool.query("SELECT COUNT(*)::int c FROM group_rooms WHERE status = 'waiting'")
  console.log(`연결 DB: ${process.env.DB_HOST} / ${process.env.DB_NAME}`)
  console.log(`새로 생성된 과팅방: ${created}개 / 현재 대기중 과팅방 총: ${total.rows[0].c}개`)
  await pool.end()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
