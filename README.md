# ORCA

테스트 관리 플랫폼 (ORCA)

---

## 주요 기능

### 테스트 케이스 관리
- 폴더 구조로 테스트 케이스 분류
- 섹션·필터 기반 뷰 + 검색
- Rich Text Editor 지원

### 테스트 실행 계획(Plan)
- 테스트/플랜 생성 및 배정
- 실행/결과 기록

### 진행률 시각화
- 도넛 차트 + 로그/리스트
- Pass/Fail/Block 상태 표시

### CSV/Excel 지원
- CSV/Excel 내보내기, CSV 가져오기

### 권한 관리
- 관리자 전용 기능 분리
- JWT 기반 인증/인가

---

## 빠른 시작

> **로컬 DB는 PostgreSQL(Prisma) 기준** 입니다. 예시: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tms_dev`

### 의존성 설치 원칙(중요)

- **루트 `package-lock.json` 1개만 사용(SSOT)** (npm workspaces)
- 설치는 **반드시 루트에서 `npm ci` 한 번**으로 통일
- `frontend/`, `backend/`에서 별도 `npm ci` 금지 (서브 `package-lock.json` 없음)

### 1. 레포지토리 클론
```bash
git clone <repository-url>
cd ORCA
```

### 2. DB/의존성/시드까지 한 번에 준비 (Windows PowerShell 권장)

루트에서:
```powershell
.\scripts\bootstrap_phase0_safety.ps1
```

- 한 번에 **Postgres 컨테이너 기동 + migrate + seed** 실행
- DB만 따로 올리고 싶다면 (로컬 포트):
```powershell
.\scripts\start_postgres.ps1
```

### 3. 개발 서버 실행(터미널 2개)

#### 옵션 A) 루트에서 한 번에 실행 (권장)

루트에서:
```powershell
npm run dev
```

개별 실행이 필요하면:
```powershell
npm run dev:backend
npm run dev:frontend
```

#### 옵션 B) 터미널 2개로 각각 실행

백엔드:
```powershell
cd backend
npm run dev
```

프런트엔드:
```powershell
cd frontend
npm run dev
```

접속 주소:
- 프런트엔드: `http://localhost:5173`
- 백엔드: `http://localhost:3001` (헬스체크: `GET /health`)

### 4. 첫 사용
1. `http://localhost:5173` 접속
2. 로그인 또는 회원가입

기본 계정:
- **admin@tms.com / admin123!**

---

## CI와 동일한 로컬 검증(권장)

루트에서 아래 커맨드로 **CI와 동일한 순서**로 실행:
```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

> 참고: 현재 ESLint가 직접 설정되어 있어 `lint`에서 실패하면 메시지를 확인하세요 (CI 환경을 위해 contact 규칙 활성).

---

## 사용법

1. 회원가입 후 관리자가 승인 (또는 기본 admin 계정 로그인)
2. 로그인
3. 폴더 생성 → 테스트 케이스 작성
4. 플랜 생성 → 테스트 실행/결과 기록

---

## 기술 스택

### 백엔드
- Express + TypeScript
- Prisma (PostgreSQL)
- JWT

### 프론트엔드
- React 18 (TypeScript)
- Vite
- Tailwind CSS

---

## 프로젝트 구조
```
ORCA/
├─ backend/          # Express API 서버 (Prisma)
├─ frontend/         # React 프런트엔드 (Vite)
├─ scripts/          # 로컬 부트스트랩/DB 스크립트 (Windows)
├─ tests/            # Playwright E2E
├─ docs/             # 규칙/운영/진행 문서
└─ packages/shared/  # 공용 타입/유틸(모노레포용)
```

---

## 테스트(검증)

```bash
npm test
```

지정 테스트만:
```bash
npm test -- tests/smoke.spec.ts
```
---

## 라이선스

MIT License
