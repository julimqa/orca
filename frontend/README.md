# TMS Frontend

Test Management System의 프론트엔드 애플리케이션입니다.

## 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS (Minimal)

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

프론트엔드가 `http://localhost:5173`에서 실행됩니다.

### 3. 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 페이지 구조

### 공개 페이지

- **`/login`** - 로그인 페이지
- **`/register`** - 회원가입 페이지

### 보호된 페이지 (로그인 필요)

- **`/`** - 홈 페이지 (대시보드)

### 관리자 전용 페이지

- **`/admin`** - 관리자 페이지 (사용자 관리)

## 프로젝트 구조

```
frontend/
├── src/
│   ├── api/
│   │   ├── axios.ts       # Axios 인스턴스 설정
│   │   ├── auth.ts        # 인증 API
│   │   └── admin.ts       # 관리자 API
│   ├── components/
│   │   ├── Navbar.tsx     # 네비게이션 바
│   │   └── PrivateRoute.tsx # 보호된 라우트
│   ├── context/
│   │   └── AuthContext.tsx # 인증 컨텍스트
│   ├── pages/
│   │   ├── LoginPage.tsx  # 로그인 페이지
│   │   ├── RegisterPage.tsx # 회원가입 페이지
│   │   ├── HomePage.tsx   # 홈 페이지
│   │   └── AdminPage.tsx  # 관리자 페이지
│   ├── App.tsx            # 라우터 설정
│   ├── main.tsx           # 엔트리 포인트
│   └── index.css          # 글로벌 스타일
├── index.html
├── vite.config.ts
└── package.json
```

## 주요 기능

### 인증 (Authentication)

- 회원가입
- 로그인 (JWT 기반)
- 로그아웃
- 자동 토큰 갱신 (Axios 인터셉터)

### 권한 관리

- PrivateRoute로 보호된 페이지 관리
- 관리자 전용 페이지 접근 제어

### 관리자 기능

- 가입 대기 사용자 조회
- 사용자 승인/거절
- 전체 사용자 목록 조회
- 비밀번호 초기화

## API 연동

백엔드 API는 `http://localhost:3001/api`에서 실행됩니다.

Vite의 프록시 설정으로 `/api` 요청은 자동으로 백엔드로 전달됩니다.

## 인증 흐름

1. 사용자가 로그인하면 백엔드에서 JWT 토큰을 받습니다.
2. 토큰은 `localStorage`에 저장됩니다.
3. Axios 인터셉터가 모든 API 요청에 자동으로 토큰을 추가합니다.
4. 토큰이 만료되면 401 에러가 발생하고 자동으로 로그아웃됩니다.

## 개발 가이드

### 새로운 페이지 추가

1. `src/pages/` 폴더에 새 컴포넌트 생성
2. `src/App.tsx`에 라우트 추가
3. 필요하면 `PrivateRoute`로 감싸기

### 새로운 API 엔드포인트 추가

1. `src/api/` 폴더에 함수 추가
2. Axios 인스턴스를 사용하여 요청
3. TypeScript 타입 정의 추가

## 환경 변수

현재는 `.env` 파일을 사용하지 않지만, 필요한 경우 Vite의 환경 변수 기능을 사용할 수 있습니다.

```env
VITE_API_URL=http://localhost:3001/api
```

사용:

```typescript
const API_URL = import.meta.env.VITE_API_URL;
```

