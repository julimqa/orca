# Railway PostgreSQL 설정 가이드

## 🚀 Railway에서 PostgreSQL 추가하기 (5분 소요)

### 1단계: Railway에 PostgreSQL 서비스 추가

1. **Railway 대시보드 접속**
   - https://railway.app 로그인
   - 프로젝트 선택

2. **PostgreSQL 추가**
   - `+ New` 버튼 클릭
   - `Database` → `PostgreSQL` 선택
   - 자동으로 PostgreSQL 서비스가 생성됩니다

3. **DATABASE_URL 확인**
   - PostgreSQL 서비스 클릭
   - `Variables` 탭에서 `DATABASE_URL` 확인
   - 형식: `postgresql://postgres:password@hostname:port/railway`

### 2단계: Backend 서비스에 DATABASE_URL 연결

Railway는 같은 프로젝트 내의 서비스끼리 자동으로 환경변수를 공유합니다.

**확인 방법:**
1. Backend 서비스 클릭
2. `Variables` 탭 열기
3. `DATABASE_URL`이 자동으로 추가되었는지 확인
4. 없다면 PostgreSQL 서비스의 `DATABASE_URL`을 복사해서 수동 추가

### 3단계: 로컬에서 마이그레이션 생성

```bash
cd backend

# Prisma Client 재생성
npm run prisma:generate

# 새 마이그레이션 생성 (PostgreSQL용)
npx prisma migrate dev --name switch_to_postgresql
```

### 4단계: Railway에 배포

```bash
# 변경사항 커밋
git add .
git commit -m "feat: Switch from SQLite to PostgreSQL"
git push origin main
```

Railway는 자동으로:
1. 코드를 감지하고 배포 시작
2. `npm run postinstall` 실행 (prisma migrate deploy)
3. 마이그레이션이 자동으로 적용됨

### 5단계: Seed 데이터 추가 (선택사항)

Railway 서비스가 배포된 후:

**옵션 A: Railway CLI 사용**
```bash
# Railway CLI 설치 (한 번만)
npm i -g @railway/cli

# Railway 로그인
railway login

# 프로젝트 연결
railway link

# Seed 실행
railway run npm run prisma:seed
```

**옵션 B: Railway 대시보드에서**
1. Backend 서비스 → `Settings` 탭
2. `Deploy` 섹션
3. `Custom Start Command`에 추가:
   ```
   npm run prisma:seed && npm start
   ```
   (첫 배포 시에만 seed 실행)

## 📊 로컬 개발 설정

### 로컬에서 PostgreSQL 사용하기

**옵션 1: Docker 사용 (권장)**

`docker-compose.yml` 파일 생성:
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

**옵션 2: Railway PostgreSQL 직접 사용**

`.env` 파일에 Railway의 DATABASE_URL 복사:
```bash
DATABASE_URL="postgresql://postgres:password@hostname:port/railway"
```

⚠️ 주의: 프로덕션 DB를 직접 사용하면 위험할 수 있습니다!

**옵션 3: SQLite 로컬 유지 (개발만)**

로컬에서는 SQLite, 프로덕션에서는 PostgreSQL 사용:

`.env.local`:
```bash
DATABASE_URL="file:./dev.db"
```

## 🔍 확인 방법

### Railway에서 데이터베이스 확인

```bash
# Railway CLI로 Prisma Studio 실행
railway run npx prisma studio
```

또는

1. Railway 대시보드
2. PostgreSQL 서비스 클릭
3. `Data` 탭에서 테이블 확인

### 연결 테스트

```bash
cd backend
npx prisma db pull  # 스키마가 제대로 연결되었는지 확인
```

## 📝 체크리스트

- [ ] Railway에 PostgreSQL 서비스 추가
- [ ] Backend 서비스의 Variables에 DATABASE_URL 확인
- [ ] 로컬에서 마이그레이션 생성
- [ ] 변경사항 커밋 & 푸시
- [ ] Railway 자동 배포 완료 확인
- [ ] (선택) Seed 데이터 추가
- [ ] 프론트엔드에서 로그인 테스트

## ❓ 문제 해결

### "Can't reach database server" 오류
- Railway에서 DATABASE_URL이 올바르게 설정되었는지 확인
- PostgreSQL 서비스가 실행 중인지 확인

### 마이그레이션 실패
```bash
# 로컬에서 직접 실행
railway run npx prisma migrate deploy
```

### Seed가 실행 안 됨
```bash
# Railway CLI로 직접 실행
railway run npm run prisma:seed
```

## 💡 팁

1. **무료 플랜 제한**: Railway 무료 플랜은 월 $5 크레딧 제공
2. **백업**: Railway는 자동 백업 제공 (Settings → Backups)
3. **로그 확인**: Backend 서비스 → Deployments → 최신 배포 → Logs
4. **환경변수**: 민감한 정보는 반드시 환경변수로 관리

## 🎉 완료!

이제 데이터가 영구적으로 저장되며, 재배포해도 사라지지 않습니다!

