# 프로젝트 진행 현황 (요약) — TMS_v2 / ORCA

> 기준 문서: `project_progress.log`  
> 목적: “무엇이 구현됐는지 / 어디에 있는지 / 로컬에서 어떻게 확인하는지”를 한 눈에 보이게 정리

---

## 1) Phase 0~5 구현 현황(기능 타임라인)

### Phase 1: 초기화 및 인증
- [x] 사용자 모델(ROLE: USER/ADMIN, STATUS: PENDING/ACTIVE/REJECTED)
- [x] Auth API(회원가입/로그인/내 정보)
- [x] Admin API(사용자 승인/목록/권한)
- [x] 프론트 로그인/회원가입 + 인증 컨텍스트/가드

### Phase 2: 테스트 케이스 관리
- [x] 폴더(계층) + 테스트케이스 모델
- [x] 폴더 트리 조회/생성 API
- [x] 테스트케이스 생성/목록 API
- [x] CSV Import(헤더 매핑 기반) + 대량 생성 UI

### Phase 3: 테스트 계획(Plan) 및 실행
- [x] Plan/PlanItem 모델 + 생성/목록/상세 API
- [x] 실행 기능
  - 개별 업데이트: `PATCH /api/plans/:planId/items/:itemId`
  - 벌크 업데이트: `PATCH /api/plans/:planId/items/bulk`
  - 메모 URL 자동 링크화(UI)

### Phase 4: UI/UX 리디자인
- [x] 디자인 시스템(Button/Card/Badge/Input 등)
- [x] 좌측 사이드바 레이아웃(TestRail 스타일)
- [x] 진행률 시각화(도넛/스택 프로그레스)
- [x] Bulk Select/Edit UX

### Phase 5: 핵심 고도화 + 대시보드/리포팅 + E2E 강화
- [x] 테스트케이스 CRUD 완성(수정/삭제/이동 포함)
- [x] 대시보드(`/`) 통계/할당/활동
- [x] 리포팅(PDF/Excel Export)
- [x] E2E 시나리오 강화(플랜 실행/테스트케이스 관리)

### Phase 6: CI 단순화 + 루트 단일 lockfile(workspaces)
- [x] npm workspaces에 `frontend`, `backend` 포함(루트에서 의존성 통합 관리)
- [x] **루트 `package-lock.json` 1개만 유지(SSOT)** / `frontend|backend/package-lock.json` 제거
- [x] CI 설치 단계 단순화: **루트에서 `npm ci` 1번**
  - `setup-node` 캐시 경로: `cache-dependency-path: package-lock.json` (루트 1개)
- [x] (회귀 방지) workspace 전환으로 인한 React 중복 설치 이슈를 해결하여 unit test 안정화

---

## 2) 현재 레포/운영 관점의 “현 상태” 메모

### 데이터베이스
- `project_progress.log`에는 SQLite로 기록되어 있으나, **현재 구현은 PostgreSQL(Prisma datasource: `postgresql`)** 기준입니다.
- 로컬 기본 DB URL: `postgresql://postgres:postgres@localhost:5432/tms_dev`

### 로컬 부트스트랩(Windows)
- 캐노니컬 DB 부트스트랩: `scripts/bootstrap.ps1`
- 호환 엔트리포인트(기존 명령 유지):
  - `scripts/start_postgres.ps1` (래퍼)
  - `scripts/bootstrap_phase0_safety.ps1` (npm ci + DB + migrate/seed)

### 검증 브랜치
- Phase 0~5 통합 검증 브랜치: `refactoring-intergration`

---

## 3) 로컬에서 확인하는 최소 절차(권장)

PowerShell(프로젝트 루트):

```powershell
.\scripts\bootstrap_phase0_safety.ps1
cd backend  ; npm run dev
cd frontend ; npm run dev
```

추가 최소 검증(Phase 6 / CI와 동일):

```powershell
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

- 프론트: `http://localhost:5173`
- 백엔드: `http://localhost:3001` (`GET /health`)
- 시드 계정: `admin@tms.com / admin123!`

---

## 4) 참고 문서
- “현 상태 스냅샷(API/라우팅/실행 스크립트)” : `docs/current-state.md`
- “원본 진행 로그(상세)” : `project_progress.log`


