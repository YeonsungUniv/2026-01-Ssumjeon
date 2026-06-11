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

// 초대코드로만 입장 가능한 비공개 방
const PRIVATE_ROOMS: { title: string; desc: string; gender: G; max: number; nick: string; dept: string; sid: string }[] = [
  { title: '🔒 비밀 과팅 (지인만)',   desc: '아는 사람만 코드로 입장',   gender: 'male',   max: 4, nick: '재현', dept: '컴퓨터소프트웨어과', sid: '20240201' },
  { title: '🔒 컴공 단톡방 모임',     desc: '코드 받은 사람만',         gender: 'female', max: 3, nick: '나윤', dept: '컴퓨터소프트웨어과', sid: '20230202' },
  { title: '🔒 동아리 비공개 과팅',   desc: '동아리원 전용 초대코드방',  gender: 'male',   max: 4, nick: '태윤', dept: '경영과',           sid: '20250203' },
]

function genInvite(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return c
}

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

  // ── 초대코드 전용(비공개) 방 ──────────────────────────────
  const codes: string[] = []
  for (const r of PRIVATE_ROOMS) {
    const exists = await pool.query("SELECT 1 FROM group_rooms WHERE title = $1 AND status = 'waiting'", [r.title])
    if (exists.rows.length > 0) continue

    const grade = Math.min(Math.max(new Date().getFullYear() - parseInt(r.sid.slice(0, 4), 10) + 1, 1), 4)
    const username = `gl_${r.sid}`
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

    // 중복 없는 초대코드 생성
    let code = genInvite()
    while ((await pool.query('SELECT 1 FROM group_rooms WHERE invite_code = $1', [code])).rows.length > 0) code = genInvite()

    const roomId = uuid()
    const preferred: G = r.gender === 'male' ? 'female' : 'male'
    await pool.query(
      `INSERT INTO group_rooms (id, title, description, leader_id, gender, max_members, preferred_gender, invite_code, is_private)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
      [roomId, r.title, r.desc, leaderId, r.gender, r.max, preferred, code],
    )
    await pool.query('INSERT INTO group_room_members (group_room_id, user_id, is_leader) VALUES ($1,$2,true)', [roomId, leaderId])
    codes.push(`${r.title} → 코드 ${code}`)
    created++
  }

  const total = await pool.query("SELECT COUNT(*)::int c FROM group_rooms WHERE status = 'waiting'")
  console.log(`연결 DB: ${process.env.DB_HOST} / ${process.env.DB_NAME}`)
  console.log(`새로 생성된 과팅방: ${created}개 / 현재 대기중 과팅방 총: ${total.rows[0].c}개`)
  if (codes.length > 0) {
    console.log('\n── 초대코드 전용 방 ──')
    codes.forEach((c) => console.log('  ' + c))
  }
  await pool.end()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
