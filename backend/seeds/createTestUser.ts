import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pool } from '../src/config/db'

const users = [
  { email: 'test1@yeonsung.ac.kr', nickname: '김민준', studentId: '20240001', department: '컴퓨터소프트웨어학과', grade: 2, gender: 'male',   bio: '코딩 좋아해요',    mbti: 'INTJ', interests: ['게임', '개발', '카페'] },
  { email: 'test2@yeonsung.ac.kr', nickname: '이서연', studentId: '20240002', department: '경영학과',            grade: 1, gender: 'female', bio: '커피 좋아해요',    mbti: 'ENFP', interests: ['독서', '음악', '카페'] },
  { email: 'test3@yeonsung.ac.kr', nickname: '박지훈', studentId: '20240003', department: '전기과',             grade: 3, gender: 'male',   bio: '운동 열심히 해요', mbti: 'ESTP', interests: ['운동', '영화', '게임'] },
]

async function run() {
  const hash = await bcrypt.hash('test1234!', 12)
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, nickname, student_id, department, grade, gender, bio, mbti, interests, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
      [uuidv4(), u.email, hash, u.nickname, u.studentId, u.department, u.grade, u.gender, u.bio, u.mbti, u.interests],
    )
    console.log(`✅ ${u.gender === 'male' ? '남' : '여'} | ${u.email} | ${u.nickname}`)
  }
  await pool.end()
}

run().catch(console.error)
