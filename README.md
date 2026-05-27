# 썸전 (Ssumjeon)

연성대학교 학생들을 위한 과팅 매칭 웹 애플리케이션

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (AWS RDS) |
| Storage | AWS S3 |
| Realtime | Socket.IO |
| Deploy | AWS EC2 + GitHub Actions |

## 주요 기능

- **회원가입 / 로그인** - 재학증명서 업로드, 관리자 승인 방식
- **1:1 매칭** - 스와이프 기반 이성 매칭
- **과팅 매칭** - 그룹 방 생성, 초대 코드, 팀 간 매칭
- **채팅** - 1:1 및 그룹 실시간 채팅, 이미지 전송
- **약속 잡기** - 채팅방 내 날짜/시간/장소 약속 제안 및 수락

## 로컬 개발 환경 설정

### 사전 요구사항

- Node.js 20+
- PostgreSQL 15+

### 설치

```bash
# 레포 클론
git clone https://github.com/coalswo1024-source/ssumjeon.git
cd ssumjeon

# 백엔드 설정
cd backend
cp .env.example .env
# .env 파일에서 DB 정보 수정
npm install
npm run migrate
npm run dev

# 프론트엔드 설정 (새 터미널)
cd frontend
npm install
npm run dev
```

## 환경 변수

`backend/.env` 파일을 `.env.example` 기반으로 생성합니다.

| 변수 | 설명 |
|---|---|
| `DB_HOST` | PostgreSQL 호스트 (RDS 엔드포인트) |
| `DB_NAME` | 데이터베이스 이름 |
| `DB_USER` | DB 유저 |
| `DB_PASSWORD` | DB 비밀번호 |
| `JWT_ACCESS_SECRET` | JWT 액세스 토큰 시크릿 |
| `JWT_REFRESH_SECRET` | JWT 리프레시 토큰 시크릿 |
| `AWS_REGION` | S3 리전 (예: ap-northeast-2) |
| `AWS_ACCESS_KEY_ID` | IAM 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | IAM 시크릿 키 |
| `AWS_S3_BUCKET` | S3 버킷 이름 |
| `CORS_ORIGIN` | 허용할 프론트엔드 URL |

## AWS 인프라

```
사용자 → EC2 (nginx)
              ├── / → React 정적 파일 (/var/www/ssumjeon)
              ├── /api → Node.js :4000
              └── /socket.io → Node.js :4000 (WebSocket)

Node.js → RDS (PostgreSQL)
        → S3 (이미지 업로드)
```

## EC2 초기 배포 (최초 1회)

```bash
# Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20
echo "nvm use 20" >> ~/.bashrc

# PM2, nginx
npm install -g pm2
sudo dnf install -y nginx

# 프론트 디렉토리
sudo mkdir -p /var/www/ssumjeon
sudo chown ec2-user:ec2-user /var/www/ssumjeon

# 레포 클론
git clone https://[TOKEN]@github.com/coalswo1024-source/ssumjeon.git ~/ssumjeon

# nginx 설정
sudo cp ~/ssumjeon/nginx.conf /etc/nginx/conf.d/ssumjeon.conf
sudo systemctl enable nginx && sudo systemctl start nginx

# 환경 변수
cp ~/ssumjeon/backend/.env.example ~/ssumjeon/backend/.env
nano ~/ssumjeon/backend/.env

# DB 마이그레이션 및 빌드
cd ~/ssumjeon/backend && npm ci && npm run migrate && npm run build
cd ~/ssumjeon/frontend && npm ci && npm run build
cp -r dist/. /var/www/ssumjeon/

# PM2 시작
cd ~/ssumjeon
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # 출력된 명령어 실행
```

## GitHub Actions 자동 배포

`main` 브랜치에 push 하면 자동으로 EC2에 배포됩니다.

### GitHub Secrets 등록

| Secret | 값 |
|---|---|
| `EC2_HOST` | EC2 퍼블릭 IP |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | `.pem` 파일 전체 내용 |
