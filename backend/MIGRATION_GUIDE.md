# SQLite → PostgreSQL 마이그레이션 가이드

## 🎯 빠른 시작 (로컬 작업)

### 1. 로컬에서 .env 파일 생성

```bash
cd backend
cp env.example .env
```

`.env` 파일 내용을 다음과 같이 수정:

```bash
# 로컬 개발용 (Docker PostgreSQL 사용 시)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tms_dev"

# 또는 Railway PostgreSQL 직접 연결 (Railway 대시보드에서 복사)
# DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:xxxx/railway"

JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

### 2. 로컬 PostgreSQL 준비

**옵션 A: Docker 사용 (가장 간단)**

프로젝트 루트에 `docker-compose.yml` 생성:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tms_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

실행:
```bash
docker-compose up -d
```

**옵션 B: 로컬 PostgreSQL 설치**
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql@15`

### 3. Prisma Client 재생성 & 마이그레이션

```bash
cd backend

# 1. Prisma Client 재생성
npm run prisma:generate

# 2. 기존 SQLite 마이그레이션 삭제
rm -rf prisma/migrations

# 3. 새로운 PostgreSQL 마이그레이션 생성
npx prisma migrate dev --name init_postgresql

# 4. Seed 데이터 추가
npm run prisma:seed
```

### 4. 서버 실행 테스트

```bash
npm run dev
```

브라우저에서 `http://localhost:3001` 접속 테스트

### 5. Git 커밋

```bash
git add .
git commit -m "feat: Switch from SQLite to PostgreSQL"
git push origin feature/add-default-accounts
```

## 🚂 Railway 배포

상세한 Railway 설정은 `RAILWAY_POSTGRESQL_SETUP.md` 참고

**간단 요약:**
1. Railway 대시보드 → `+ New` → `Database` → `PostgreSQL`
2. Backend 서비스에서 `DATABASE_URL` 자동 연결 확인
3. Git push → Railway 자동 배포
4. (선택) Railway CLI로 seed 실행

## 📋 명령어 모음

```bash
# Prisma Client 생성
npm run prisma:generate

# 마이그레이션 생성 (개발)
npx prisma migrate dev --name migration_name

# 마이그레이션 적용 (프로덕션)
npx prisma migrate deploy

# Prisma Studio 실행
npm run prisma:studio

# Seed 데이터 추가
npm run prisma:seed

# DB 초기화 (경고: 모든 데이터 삭제)
npx prisma migrate reset
```

## ⚠️ 주의사항

1. **기존 SQLite 데이터는 이전되지 않습니다**
   - 새로 시작하거나 수동으로 데이터 이전 필요

2. **개발/프로덕션 DB 분리**
   - 로컬: Docker PostgreSQL
   - 프로덕션: Railway PostgreSQL

3. **환경변수 관리**
   - `.env` 파일은 절대 Git에 커밋하지 마세요
   - Railway에서는 대시보드로 관리

4. **마이그레이션 파일 관리**
   - `prisma/migrations/` 폴더는 Git에 커밋 필요
   - 팀원과 동기화 필수

## 🔄 롤백 (SQLite로 복귀)

만약 문제가 생기면:

```bash
cd backend

# schema.prisma 수정
# datasource db {
#   provider = "sqlite"
#   url      = "file:./dev.db"
# }

# 마이그레이션 초기화
rm -rf prisma/migrations
npx prisma migrate dev --name init

# Seed 실행
npm run prisma:seed
```

## 🎉 완료!

이제 데이터베이스가 영구적으로 저장됩니다!

