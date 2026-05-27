import bcrypt from 'bcryptjs'
import { pool } from '../config/db'

const TEST_USERS = [
  {
    email: 'testA@yeonsung.ac.kr',
    username: 'testA',
    nickname: '김민준',
    student_id: '20210001',
    department: '컴퓨터소프트웨어학과',
    grade: 4,
    gender: 'male',
    mbti: 'INTJ',
    interests: ['게임', '영화', '음악'],
    bio: '안녕하세요, 컴공 4학년입니다.',
  },
  {
    email: 'testB@yeonsung.ac.kr',
    username: 'testB',
    nickname: '이지은',
    student_id: '20220002',
    department: '경영학과',
    grade: 3,
    gender: 'female',
    mbti: 'ENFP',
    interests: ['카페', '여행', '독서'],
    bio: '경영학과 3학년이에요!',
  },
  {
    email: 'testC@yeonsung.ac.kr',
    username: 'testC',
    nickname: '박서연',
    student_id: '20230003',
    department: '간호학과',
    grade: 2,
    gender: 'female',
    mbti: 'ISFJ',
    interests: ['요리', '음악', '산책'],
    bio: '간호학과 2학년입니다 :)',
  },
]

export async function seedTestUsers() {
  const passwordHash = await bcrypt.hash('test1234!', 10)

  for (const u of TEST_USERS) {
    await pool.query(
      `INSERT INTO users
        (email, password_hash, username, nickname, student_id, department, grade, gender,
         mbti, interests, bio, is_verified, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,'approved')
       ON CONFLICT (email) DO NOTHING`,
      [
        u.email, passwordHash, u.username, u.nickname,
        u.student_id, u.department, u.grade, u.gender,
        u.mbti, u.interests, u.bio,
      ],
    )
  }

  console.log('[Seed] 테스트 계정 3개 준비 완료 (testA/B/C@yeonsung.ac.kr / test1234!)')
}
