import bcrypt from 'bcryptjs'
import { pool } from '../config/db'

const TEST_USERS = [
  // ── 기존 3개 ──────────────────────────────────────────────────
  {
    email: 'testA@yeonsung.ac.kr', username: 'testA', nickname: '김민준',
    student_id: '20210001', department: '컴퓨터소프트웨어학과', grade: 4,
    gender: 'male', mbti: 'INTJ', interests: ['게임', '영화', '음악'],
    bio: '안녕하세요, 컴공 4학년입니다.',
  },
  {
    email: 'testB@yeonsung.ac.kr', username: 'testB', nickname: '이지은',
    student_id: '20220002', department: '경영학과', grade: 3,
    gender: 'female', mbti: 'ENFP', interests: ['카페', '여행', '독서'],
    bio: '경영학과 3학년이에요!',
  },
  {
    email: 'testC@yeonsung.ac.kr', username: 'testC', nickname: '박서연',
    student_id: '20230003', department: '간호학과', grade: 2,
    gender: 'female', mbti: 'ISFJ', interests: ['요리', '음악', '산책'],
    bio: '간호학과 2학년입니다 :)',
  },
  // ── 추가 17개 ─────────────────────────────────────────────────
  {
    email: 'test04@yeonsung.ac.kr', username: 'test04', nickname: '이준서',
    student_id: '20220004', department: '전기전자학과', grade: 3,
    gender: 'male', mbti: 'ESTP', interests: ['운동', '게임', '드라이브'],
    bio: '전전과 3학년! 활동적인 걸 좋아해요.',
  },
  {
    email: 'test05@yeonsung.ac.kr', username: 'test05', nickname: '박지호',
    student_id: '20230005', department: '기계자동차학과', grade: 2,
    gender: 'male', mbti: 'INFP', interests: ['그림', '음악', '산책'],
    bio: '조용하지만 친해지면 재밌어요.',
  },
  {
    email: 'test06@yeonsung.ac.kr', username: 'test06', nickname: '최도현',
    student_id: '20240006', department: '경영학과', grade: 1,
    gender: 'male', mbti: 'ENTP', interests: ['토론', '독서', '유튜브'],
    bio: '경영학과 새내기입니다~ 친하게 지내요!',
  },
  {
    email: 'test07@yeonsung.ac.kr', username: 'test07', nickname: '정시우',
    student_id: '20210007', department: '호텔관광학과', grade: 4,
    gender: 'male', mbti: 'ISFP', interests: ['여행', '요리', '영화'],
    bio: '졸업반이에요. 여행 좋아합니다.',
  },
  {
    email: 'test08@yeonsung.ac.kr', username: 'test08', nickname: '강준혁',
    student_id: '20220008', department: '건축인테리어학과', grade: 3,
    gender: 'male', mbti: 'ENTJ', interests: ['건축', '운동', '커피'],
    bio: '설계 좋아하는 건인과입니다.',
  },
  {
    email: 'test09@yeonsung.ac.kr', username: 'test09', nickname: '윤서준',
    student_id: '20230009', department: '임상병리학과', grade: 2,
    gender: 'male', mbti: 'INTP', interests: ['과학', '독서', '게임'],
    bio: '실험실 덕후 임병과 2학년.',
  },
  {
    email: 'test10@yeonsung.ac.kr', username: 'test10', nickname: '장우진',
    student_id: '20240010', department: '보건행정학과', grade: 1,
    gender: 'male', mbti: 'ESFJ', interests: ['축구', '카페', '음악'],
    bio: '보건행정과 1학년이에요. 잘 부탁드려요!',
  },
  {
    email: 'test11@yeonsung.ac.kr', username: 'test11', nickname: '임태양',
    student_id: '20220011', department: '사회복지학과', grade: 3,
    gender: 'male', mbti: 'INFJ', interests: ['봉사', '독서', '영화'],
    bio: '사람을 돕는 게 좋아요.',
  },
  {
    email: 'test12@yeonsung.ac.kr', username: 'test12', nickname: '한승민',
    student_id: '20230012', department: '방사선학과', grade: 2,
    gender: 'male', mbti: 'ENFJ', interests: ['헬스', '요리', '여행'],
    bio: '방사선과 2학년, 헬스 열심히 해요.',
  },
  {
    email: 'test13@yeonsung.ac.kr', username: 'test13', nickname: '조아린',
    student_id: '20240013', department: '유아교육과', grade: 1,
    gender: 'female', mbti: 'ESFP', interests: ['아이들', '춤', '노래'],
    bio: '밝고 활발한 유교과 1학년이에요!',
  },
  {
    email: 'test14@yeonsung.ac.kr', username: 'test14', nickname: '신예린',
    student_id: '20230014', department: '뷰티케어학과', grade: 2,
    gender: 'female', mbti: 'INFP', interests: ['메이크업', '쇼핑', '카페'],
    bio: '뷰티케어과 2학년. 꾸미는 거 좋아해요.',
  },
  {
    email: 'test15@yeonsung.ac.kr', username: 'test15', nickname: '오지원',
    student_id: '20220015', department: '항공서비스학과', grade: 3,
    gender: 'female', mbti: 'ENFP', interests: ['여행', '외국어', '영화'],
    bio: '항공서비스과 3학년. 하늘 꿈꿔요✈️',
  },
  {
    email: 'test16@yeonsung.ac.kr', username: 'test16', nickname: '문채원',
    student_id: '20210016', department: '식품영양학과', grade: 4,
    gender: 'female', mbti: 'ISFJ', interests: ['요리', '베이킹', '독서'],
    bio: '식영과 졸업반이에요. 밥 잘 해요!',
  },
  {
    email: 'test17@yeonsung.ac.kr', username: 'test17', nickname: '배수아',
    student_id: '20230017', department: '물리치료학과', grade: 2,
    gender: 'female', mbti: 'ESTJ', interests: ['운동', '헬스', '스트레칭'],
    bio: '물리치료과 2학년. 몸관리 중요해요!',
  },
  {
    email: 'test18@yeonsung.ac.kr', username: 'test18', nickname: '권나은',
    student_id: '20240018', department: '치위생학과', grade: 1,
    gender: 'female', mbti: 'ESFJ', interests: ['카페', '산책', '유튜브'],
    bio: '치위생과 새내기입니다 반가워요:)',
  },
  {
    email: 'test19@yeonsung.ac.kr', username: 'test19', nickname: '양하은',
    student_id: '20220019', department: '작업치료학과', grade: 3,
    gender: 'female', mbti: 'INTJ', interests: ['독서', '명상', '음악'],
    bio: '조용하고 사려깊은 작업치료과 3학년.',
  },
  {
    email: 'test20@yeonsung.ac.kr', username: 'test20', nickname: '홍지수',
    student_id: '20230020', department: '컴퓨터소프트웨어학과', grade: 2,
    gender: 'female', mbti: 'ISTP', interests: ['코딩', '게임', '애니'],
    bio: '컴공과 2학년. 코딩하는 여자예요.',
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
       ON CONFLICT (email) DO UPDATE SET
         username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash,
         status = 'approved'`,
      [
        u.email, passwordHash, u.username, u.nickname,
        u.student_id, u.department, u.grade, u.gender,
        u.mbti, u.interests, u.bio,
      ],
    )
  }

  console.log('[Seed] 테스트 계정 20개 준비 완료 (test01~20@yeonsung.ac.kr / test1234!)')
}
