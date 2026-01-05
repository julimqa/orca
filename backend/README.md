# TMS Backend API

Test Management System의 백엔드 API 서버입니다.

## 기술 스택

- **Framework**: Express + TypeScript
- **Database**: SQLite (개발용, 설치 불필요)
- **ORM**: Prisma
- **Authentication**: JWT
- **Password Hashing**: bcrypt

## 빠른 시작 (간편 설치)

### 1. 의존성 설치 (자동 설정 포함)

```bash
npm install
```

이 명령어 하나로 다음이 자동으로 실행됩니다:
- 패키지 설치
- Prisma Client 생성
- 데이터베이스 마이그레이션

### 2. 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3001`에서 실행됩니다.

✅ **완료!** 별도의 데이터베이스 설치나 환경 변수 설정이 필요 없습니다.

## 추가 설정 (선택사항)

환경 변수를 커스터마이징하려면:

```bash
cp env.example .env
```

`.env` 파일에서 필요한 값을 수정하세요. (기본값으로도 작동합니다)

### 6. 프로덕션 빌드

```bash
npm run build
npm start
```

## API 엔드포인트

### 인증 (Authentication)

#### 회원가입
- **POST** `/api/auth/signup`
- Body: `{ email, password, name }`
- 첫 번째 사용자는 자동으로 ADMIN & ACTIVE 처리

#### 로그인
- **POST** `/api/auth/login`
- Body: `{ email, password }`
- Response: `{ accessToken, user }`

#### 현재 사용자 정보
- **GET** `/api/auth/me`
- Headers: `Authorization: Bearer <token>`

### 관리자 (Admin) - 🔒 ADMIN 권한 필요

#### 가입 대기 사용자 목록
- **GET** `/api/admin/pending-users`

#### 모든 사용자 목록
- **GET** `/api/admin/users`

#### 사용자 승인/거절
- **PATCH** `/api/admin/users/approve`
- Body: `{ email, action: "approve" | "reject" }`

#### 사용자 역할 변경
- **PATCH** `/api/admin/users/role`
- Body: `{ email, role: "USER" | "ADMIN" }`

#### 비밀번호 초기화
- **POST** `/api/admin/users/reset-password`
- Body: `{ email, newPassword }`

## 프로젝트 구조

```
backend/
├── src/
│   ├── index.ts              # Express 서버 엔트리
│   ├── routes/
│   │   ├── auth.ts           # 인증 라우트
│   │   └── admin.ts          # 관리자 라우트
│   ├── controllers/
│   │   ├── authController.ts # 인증 컨트롤러
│   │   └── adminController.ts# 관리자 컨트롤러
│   ├── middleware/
│   │   ├── auth.ts           # JWT 검증 미들웨어
│   │   └── roleCheck.ts      # 권한 체크 미들웨어
│   ├── utils/
│   │   ├── jwt.ts            # JWT 유틸리티
│   │   └── password.ts       # 비밀번호 해싱
│   └── lib/
│       └── prisma.ts         # Prisma Client
├── prisma/
│   └── schema.prisma         # DB 스키마
└── package.json
```

## 데이터베이스 스키마

### User 모델

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(USER)
  status    Status   @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}

enum Status {
  PENDING
  ACTIVE
  REJECTED
}
```

## 보안

- 비밀번호는 bcrypt로 해시화되어 저장
- JWT 토큰은 7일간 유효 (환경 변수로 설정 가능)
- 관리자 전용 API는 role 체크 미들웨어로 보호
- CORS 설정으로 허용된 origin만 접근 가능

## 개발 도구

- **Prisma Studio**: `npm run prisma:studio` - 데이터베이스 GUI
- **Hot Reload**: nodemon으로 코드 변경 시 자동 재시작

---

## 로그(Observability)

- **로그 출력**: 표준 출력(stdout)
- **로그 레벨**: `LOG_LEVEL` 환경 변수로 조절 (기본값: `info`)
- **요청 상관관계 ID(Request Correlation)**:
  - 요청 헤더 `X-Request-Id`가 들어오면 그대로 사용
  - 없으면 서버가 내부적으로 생성(UUID)
  - **응답에는 노출하지 않고(log only), 모든 요청/에러 로그에 포함**됩니다.

