# TMS_v2 — Current State Snapshot (Phase 0.1)

> 기준: `backend/src`, `frontend/src`, `tests`, `playwright.config.ts`를 읽어 **현재 동작을 문서화**합니다.  
> **중요**: 이 문서는 “현 상태를 잠그기 위한 스냅샷”이며, UI/UX·API 계약·비즈니스 로직 변경을 포함하지 않습니다.

---

## 1) 디렉토리 트리 (핵심만)

> `node_modules/` 등 대용량/빌드 산출물은 생략하고, 실행/개발에 핵심인 폴더만 나열합니다.

### Root

- `backend/`: Express + Prisma 기반 API 서버
- `frontend/`: Vite + React SPA
- `scripts/`: 로컬 개발 부트스트랩/DB 기동 스크립트
- `tests/`: Playwright E2E 테스트
- `docs/rules/`: 레포 규칙 문서
- `playwright.config.ts`: E2E 실행 시 FE/BE 자동 기동 설정

### `backend/src`

```
backend/src
|-- index.ts
|-- controllers/
|-- lib/
|-- middleware/
|-- routes/
`-- utils/
```

### `frontend/src`

```
frontend/src
|-- App.tsx
|-- main.tsx
|-- api/
|-- components/
|-- context/
|-- pages/
`-- utils/
```

### `tests`

```
tests
|-- auth.spec.ts
|-- plan.spec.ts
|-- plan_execution.spec.ts
|-- seed-accounts.spec.ts
`-- testcase_management.spec.ts
```

---

## 2) 백엔드 API 엔드포인트 목록 (method + path)

> 기준 파일: `backend/src/index.ts`, `backend/src/routes/*.ts`  
> 아래 경로는 **prefix 포함(full path)** 입니다.

### 공통 / 기타

- `GET /health`: 헬스 체크(JSON 응답)
- `GET /uploads/*`: 업로드된 파일 정적 서빙 (특히 `/uploads/images/...`)

### Auth — `/api/auth`

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (인증 필요)
- `PATCH /api/auth/profile` (인증 필요)
- `POST /api/auth/change-password` (인증 필요)

### Admin — `/api/admin` (인증 + 관리자 권한 필요)

- `GET /api/admin/pending-users`
- `GET /api/admin/users`
- `PATCH /api/admin/users/approve`
- `PATCH /api/admin/users/role`
- `PATCH /api/admin/users/status`
- `POST /api/admin/users/reset-password`

### Folders — `/api/folders` (인증 필요)

- `GET /api/folders/tree`
- `POST /api/folders/`
- `PATCH /api/folders/reorder`
- `DELETE /api/folders/bulk`
- `PATCH /api/folders/:id/move`
- `PATCH /api/folders/:id/rename`
- `DELETE /api/folders/:id`
- `GET /api/folders/:folderId/testcases`

### TestCases — `/api/testcases` (인증 필요)

- `GET /api/testcases/`
- `POST /api/testcases/`
- `POST /api/testcases/reorder`
- `POST /api/testcases/move`
- `PATCH /api/testcases/bulk`
- `DELETE /api/testcases/bulk`
- `PATCH /api/testcases/:id`
- `DELETE /api/testcases/:id`
- `POST /api/testcases/import` (multipart, field: `file`)

### Plans — `/api/plans` (인증 필요)

- `GET /api/plans/`
- `POST /api/plans/`
- `PATCH /api/plans/bulk/archive`
- `PATCH /api/plans/bulk/unarchive`
- `DELETE /api/plans/bulk`
- `GET /api/plans/:planId`
- `PATCH /api/plans/:planId`
- `DELETE /api/plans/:planId`
- `PATCH /api/plans/:planId/archive`
- `PATCH /api/plans/:planId/unarchive`
- `PATCH /api/plans/:planId/items/bulk`
- `PATCH /api/plans/:planId/items/:itemId`

### Dashboard — `/api/dashboard` (인증 필요)

- `GET /api/dashboard/stats`
- `GET /api/dashboard/my-assignments`
- `GET /api/dashboard/recent-activity`
- `GET /api/dashboard/overview`
- `GET /api/dashboard/active-plans`

### Upload — `/api/upload` (인증 필요)

- `POST /api/upload/image` (multipart, field: `image`)
  - 성공 시 `data.url`에 `/uploads/images/<filename>` 형태 반환

---

## 3) 프론트엔드 주요 페이지/컴포넌트

> 기준 파일: `frontend/src/App.tsx` 및 `frontend/src/pages`, `frontend/src/components`

### 라우팅 맵 (React Router)

- `GET /login` → `LoginPage`
- `GET /register` → `RegisterPage`
- 아래는 공통 `Layout` 래핑 + `PrivateRoute` 보호
  - `GET /` → `DashboardPage`
  - `GET /testcases` → `TestCasesPage`
  - `GET /plans` → `PlansPage`
  - `GET /plans/create` → `CreatePlanPage`
  - `GET /plans/:planId` → `PlanDetailPage`
  - `GET /admin` → `AdminPage` (추가로 `RequireAdmin` 적용)
  - `GET /settings` → `SettingsPage`
- `GET *` → `Navigate(to: "/")`

### 핵심 컴포넌트(구조/권한)

- `AuthProvider` (`context/AuthContext.tsx`): 인증 상태/세션 컨텍스트
- `PrivateRoute`: 로그인 보호
- `RequireAdmin`: 관리자 권한 보호
- `Layout`, `MainLayout`, `Navbar`, `Sidebar`, `Header`: 공통 레이아웃/네비게이션

### 주요 기능 컴포넌트(예시)

- 테스트케이스: `FolderTree`, `TestCaseDetailPanel`, `TestCaseFormModal`, `BulkEditModal`, `CsvImportModal`
- 플랜: `PlanEditModal`, (상세 화면은 `pages/PlanDetailPage.tsx` 등에서 조합)
- 대시보드: `DonutChart`, `MultiColorDonutChart`, `StackedProgressBar`, `RunSummary`, `RunStatusLegend`
- 에디터: `RichTextEditor`
- UI 프리미티브: `components/ui/*` (Button, Card, Input, Modal 등)

---

## 4) 테스트/실행 스크립트(현 구성)

### Root (`package.json`)

- `npm test` → `playwright test`
- `npm run test:ui` → `playwright test --ui`

### Playwright (`playwright.config.ts`)

- `testDir: ./tests`
- `baseURL: http://localhost:5173`
- E2E 실행 시 서버 자동 기동:
  - backend: `npm run dev --prefix backend` (port 3001)
  - frontend: `npm run dev --prefix frontend` (port 5173)

### Backend (`backend/package.json`)

- `npm run dev`: `nodemon src/index.ts`
- `npm run build`: `tsc`
- `npm start`: `prisma migrate deploy && node dist/index.js`
- Prisma 유틸: `prisma generate`, `migrate`, `studio`, `seed`

### Frontend (`frontend/package.json`)

- `npm run dev`: `vite`
- `npm run build`: `tsc && vite build`
- `npm run preview`: `vite preview`

---

## 5) 로컬 개발 환경 메모 (DB/컨테이너)

### Prisma datasource (현재 스키마 기준)

- `backend/prisma/schema.prisma`의 `datasource db.provider`는 **`postgresql`** 입니다.
- `backend/env.example`도 `DATABASE_URL="postgresql://..."` 형태로 제공됩니다.

### 컨테이너 기동 스크립트

- `scripts/bootstrap.ps1`
  - Docker/Podman 런타임 및 compose 명령을 자동 감지해 `postgres` 서비스를 기동하고(필수: `5432:5432`), healthcheck 기반으로 DB 준비 완료까지 대기
  - 강제 지정: `CONTAINER_RUNTIME=docker|podman` 또는 `-Engine docker|podman`
- `scripts/start_postgres.ps1`
  - ✅ 호환용 엔트리포인트(래퍼): 내부적으로 `scripts/bootstrap.ps1`를 호출
- `scripts/bootstrap_phase0_safety.ps1`
  - 루트/백엔드/프론트 `npm ci` + DB 기동 + `prisma migrate deploy` + `seed`까지 자동화

---

## 6) 발견된 문서/구성 불일치(수정하지 않고 기록만)

- `README.md`에는 “SQLite 사용”으로 안내되어 있으나, 현재 `backend/prisma/schema.prisma`는 **PostgreSQL** datasource로 설정되어 있습니다.


