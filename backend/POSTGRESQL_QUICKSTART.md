# PostgreSQL 빠른 시작 가이드

## 🚀 5분 안에 PostgreSQL로 전환하기

### Windows (PowerShell)

```powershell
# 1. Docker 또는 Podman으로 PostgreSQL 시작 (프로젝트 루트에서)
cd ..
.\scripts\start_postgres.ps1
cd backend

# 2. 자동 마이그레이션 스크립트 실행
.\scripts\migrate-to-postgresql.ps1
```

### Mac/Linux (Bash)

```bash
# 1. Docker로 PostgreSQL 시작 (프로젝트 루트에서)
cd ..
docker-compose up -d
cd backend

# 2. 실행 권한 부여
chmod +x scripts/migrate-to-postgresql.sh

# 3. 자동 마이그레이션 스크립트 실행
./scripts/migrate-to-postgresql.sh
```

### 수동 실행 (단계별)

```bash
cd backend

# 1. .env 파일 생성
cp env.example .env

# 2. .env 파일 수정
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tms_dev"

# 3. Docker PostgreSQL 시작 (프로젝트 루트에서)
cd .. && docker-compose up -d && cd backend

# 4. Prisma Client 재생성
npm run prisma:generate

# 5. 기존 마이그레이션 삭제 (Windows: rmdir /s prisma\migrations)
rm -rf prisma/migrations

# 6. 새 마이그레이션 생성
npx prisma migrate dev --name init_postgresql

# 7. Seed 데이터 추가
npm run prisma:seed

# 8. 서버 실행
npm run dev
```

## ✅ 확인 방법

### 1. PostgreSQL 연결 확인
```bash
# Docker 컨테이너 확인
docker ps

# 또는 Podman 컨테이너 확인
podman ps

# 출력 예시:
# CONTAINER ID   IMAGE              STATUS         PORTS                    NAMES
# abc123def456   postgres:15-alpine Up 2 minutes   0.0.0.0:5432->5432/tcp   tms_postgres
```

### 2. 데이터베이스 확인
```bash
# Prisma Studio 실행
npm run prisma:studio

# 브라우저에서 http://localhost:5555 열림
# - users 테이블에 6개 계정 확인
# - admin@tms.com (관리자)
# - test1@tms.com ~ test5@tms.com (테스트 계정)
```

### 3. 서버 테스트
```bash
# 서버 실행
npm run dev

# 다른 터미널에서 테스트
curl http://localhost:3001/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"admin@tms.com","password":"admin123!"}'
```

## 🎯 Railway 배포

상세 가이드: `RAILWAY_POSTGRESQL_SETUP.md`

**빠른 단계:**
1. Railway 대시보드 → `+ New` → `PostgreSQL`
2. Git push → 자동 배포
3. Railway CLI로 seed 실행:
   ```bash
   railway run npm run prisma:seed
   ```

## 📊 Docker 명령어

```bash
# PostgreSQL 시작
docker-compose up -d

# PostgreSQL 중지
docker-compose down

# PostgreSQL 중지 + 데이터 삭제
docker-compose down -v

# 로그 확인
docker-compose logs postgres

# 실시간 로그
docker-compose logs -f postgres

# PostgreSQL 접속
docker exec -it tms_postgres psql -U postgres -d tms_dev
```

## 🔧 문제 해결

### Docker가 없는 경우
- Windows: https://www.docker.com/products/docker-desktop/
- Mac: `brew install --cask docker`
- Linux: https://docs.docker.com/engine/install/

### Docker 대신 Podman을 쓰는 경우 (권장: Windows)
- Podman Desktop 설치 후 `podman` CLI가 잡히는지 확인
- 프로젝트 루트에서 실행:
  - `.\scripts\start_postgres.ps1 -Engine podman`

### 포트 5432가 이미 사용 중
```yaml
# docker-compose.yml에서 포트 변경
ports:
  - "5433:5432"  # 로컬 5433 포트 사용

# .env 파일도 수정
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/tms_dev"
```

### "Can't reach database server"
```bash
# PostgreSQL이 실행 중인지 확인
docker ps

# 없으면 시작
docker-compose up -d

# 5초 대기 후 재시도
```

### 마이그레이션 오류
```bash
# 완전 초기화
docker-compose down -v
docker-compose up -d
npm run prisma:generate
npx prisma migrate dev --name init_postgresql
npm run prisma:seed
```

## 💡 팁

1. **로컬 개발**: Docker PostgreSQL 사용 (간단)
2. **프로덕션**: Railway PostgreSQL 사용 (안정적)
3. **데이터 백업**: Prisma Studio에서 내보내기
4. **팀 협업**: 마이그레이션 파일 Git 공유 필수

## 🎉 완료!

이제 데이터가 영구적으로 저장됩니다!
재배포해도 사라지지 않습니다! 🚀

