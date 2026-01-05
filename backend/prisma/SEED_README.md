# Seed 데이터 가이드

## 개요
이 프로젝트는 관리자 및 테스트용 계정을 데이터베이스에 자동으로 생성하는 seed 스크립트를 제공합니다.

## 생성되는 계정

### 1. 관리자 계정
- **이메일**: `admin@tms.com`
- **비밀번호**: `admin123!`
- **역할**: `ADMIN`
- **상태**: `ACTIVE`

### 2. 테스트 계정 1
- **이메일**: `test1@tms.com`
- **비밀번호**: `test123!`
- **역할**: `USER`
- **상태**: `ACTIVE`

### 3. 테스트 계정 2
- **이메일**: `test2@tms.com`
- **비밀번호**: `test123!`
- **역할**: `USER`
- **상태**: `ACTIVE`

### 4. 테스트 계정 3
- **이메일**: `test3@tms.com`
- **비밀번호**: `test123!`
- **역할**: `USER`
- **상태**: `ACTIVE`

### 5. 테스트 계정 4
- **이메일**: `test4@tms.com`
- **비밀번호**: `test123!`
- **역할**: `USER`
- **상태**: `ACTIVE`

### 6. 테스트 계정 5
- **이메일**: `test5@tms.com`
- **비밀번호**: `test123!`
- **역할**: `USER`
- **상태**: `ACTIVE`

## 실행 방법

### 방법 1: npm 스크립트 사용 (권장)
```bash
cd backend
npm run prisma:seed
```

### 방법 2: Prisma CLI 직접 사용
```bash
cd backend
npx prisma db seed
```

### 방법 3: ts-node로 직접 실행
```bash
cd backend
npx ts-node prisma/seed.ts
```

## 주의사항

⚠️ **중요**: seed 스크립트는 기존의 admin@tms.com, test1@tms.com ~ test5@tms.com 계정을 삭제하고 다시 생성합니다.

- 개발 환경에서만 사용하세요.
- 프로덕션 환경에서는 기존 데이터가 삭제될 수 있으므로 주의가 필요합니다.
- 필요에 따라 seed.ts 파일을 수정하여 계정 정보를 변경할 수 있습니다.

## 비밀번호 변경

seed.ts 파일에서 비밀번호를 변경하려면:

```typescript
const adminPassword = await bcrypt.hash('새로운_비밀번호', SALT_ROUNDS);
```

## 추가 계정 생성

seed.ts 파일에 다음과 같은 형식으로 계정을 추가할 수 있습니다:

```typescript
const newUser = await prisma.user.create({
  data: {
    email: 'new@tms.com',
    password: await bcrypt.hash('password123!', SALT_ROUNDS),
    name: '새 사용자',
    role: 'USER',
    status: 'ACTIVE'
  }
});
```

## 문제 해결

### 오류: "Module not found: bcrypt"
```bash
npm install
```

### 오류: "Prisma Client not generated"
```bash
npm run prisma:generate
```

### 데이터베이스 초기화
```bash
npx prisma migrate reset
# 이 명령은 자동으로 seed를 실행합니다
```

