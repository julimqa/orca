# Railway 배포 오류 해결 가이드

## 🚨 현재 오류

```
Error: the URL must start with the protocol `postgresql://` or `postgres://`
```

**원인:** Railway에 PostgreSQL 서비스가 추가되지 않아 DATABASE_URL이 없음

## ✅ 해결 방법 (3단계)

### 1단계: Railway에 PostgreSQL 추가 (필수)

1. **Railway 대시보드 접속**
   - https://railway.app 로그인
   - TMS_v2 프로젝트 선택

2. **PostgreSQL 추가**
   ```
   프로젝트 화면에서:
   1. 우측 상단 "+ New" 버튼 클릭
   2. "Database" 선택
   3. "Add PostgreSQL" 클릭
   4. 자동으로 PostgreSQL 서비스가 생성됨
   ```

3. **DATABASE_URL 자동 연결 확인**
   ```
   PostgreSQL 서비스가 생성되면:
   - DATABASE_URL 환경변수가 자동으로 생성됨
   - 같은 프로젝트 내의 다른 서비스(Backend)에서도 사용 가능
   ```

### 2단계: Backend 서비스 환경변수 확인

Railway 대시보드에서:

1. **Backend 서비스 클릭**
2. **Variables 탭 열기**
3. **DATABASE_URL 확인**
   - 자동으로 추가되어 있어야 함
   - 형식: `postgresql://postgres:xxxxx@containers-us-west-xxx.railway.app:xxxx/railway`
   
4. **없다면 수동 추가:**
   - PostgreSQL 서비스로 이동
   - Variables 탭에서 `DATABASE_URL` 복사
   - Backend 서비스의 Variables에 추가

### 3단계: 재배포

PostgreSQL 추가 후:

**자동 재배포:**
- Railway가 자동으로 감지하고 재배포 시작

**수동 재배포:**
```
Backend 서비스 → Deployments 탭 → "Redeploy" 버튼
```

## 📊 배포 성공 확인

### 1. 배포 로그 확인

```
Backend 서비스 → Deployments → 최신 배포 → View Logs

예상 출력:
✅ Prisma schema loaded from prisma/schema.prisma
✅ Datasource "db": PostgreSQL database
✅ Migrations applied successfully
✅ Server running on port 3001
```

### 2. Health Check

```bash
curl https://your-backend.railway.app/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2025-12-07T..."
}
```

### 3. Database 연결 확인

Railway CLI:
```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# Prisma Studio 실행
railway run npx prisma studio --prefix backend
```

## 🌱 Seed 데이터 추가 (선택사항)

배포 성공 후 기본 계정 추가:

### 방법 1: Railway CLI (권장)

```bash
# Backend 디렉토리에서
railway run npm run prisma:seed
```

### 방법 2: 일회성 배포 명령

Railway 대시보드:
1. Backend 서비스 → Settings
2. "Custom Start Command" 입력:
   ```
   npm run prisma:seed && npm start
   ```
3. 배포 완료 후 다시 원래대로 변경:
   ```
   npm start
   ```

## 🎯 생성되는 계정

Seed 실행 후:
- **관리자:** admin@tms.com / admin123!
- **테스트 1:** test1@tms.com / test123!
- **테스트 2:** test2@tms.com / test123!
- **테스트 3:** test3@tms.com / test123!
- **테스트 4:** test4@tms.com / test123!
- **테스트 5:** test5@tms.com / test123!

## 🔍 문제 해결

### PostgreSQL 서비스가 보이지 않음

```
1. Railway 프로젝트 화면에서 모든 서비스 확인
2. PostgreSQL 서비스 카드를 찾을 수 없다면 다시 추가
3. 프로젝트 당 하나의 PostgreSQL만 필요
```

### DATABASE_URL이 여전히 없음

```
1. PostgreSQL 서비스 클릭
2. Variables 탭에서 DATABASE_URL 값 복사
3. Backend 서비스 Variables에 수동 추가:
   - Key: DATABASE_URL
   - Value: (복사한 값)
```

### 빌드는 성공했지만 서버 시작 실패

```
로그 확인:
- "Migration failed" → PostgreSQL 연결 문제
- "Port already in use" → Railway 자동 할당 문제 (재배포)
- "Cannot find module" → build 스크립트 확인
```

### 기존 데이터 유지

```
PostgreSQL을 새로 추가하면:
- 기존 SQLite 데이터는 이전되지 않음
- 새로운 PostgreSQL은 빈 상태로 시작
- Seed를 실행하여 기본 계정 추가 필요
```

## 📝 환경변수 전체 목록

### Backend 서비스

```bash
DATABASE_URL="postgresql://postgres:xxxxx@xxxxx.railway.app:xxxx/railway"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
NODE_ENV="production"
PORT="3001"  # Railway가 자동 할당하는 경우 생략 가능
FRONTEND_URL="https://your-frontend.vercel.app"
```

### Frontend 서비스 (Vercel)

```bash
VITE_API_URL="https://your-backend.railway.app"
```

## 💡 팁

1. **무료 플랜 제한**
   - Railway 무료: $5/월 크레딧
   - PostgreSQL: 약 100MB 저장공간
   - 충분히 테스트용으로 사용 가능

2. **로그 실시간 확인**
   ```bash
   railway logs --service backend
   ```

3. **데이터베이스 백업**
   - Railway 대시보드 → PostgreSQL 서비스
   - Settings → Backups
   - 자동 백업 활성화 권장

4. **보안**
   - JWT_SECRET은 반드시 변경
   - 프로덕션에서는 강력한 랜덤 문자열 사용
   - DATABASE_URL은 절대 Git에 커밋하지 말 것

## 🚀 완료!

PostgreSQL 추가 후 자동으로 재배포되면 모든 것이 정상 작동합니다!

문제가 계속되면 Railway 로그를 확인하세요.

