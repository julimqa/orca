# Phase 6 — Automation & Ops (CI + Logging)

## CI (GitHub Actions)

- 기본 CI: `.github/workflows/ci.yml`
  - 트리거: `push` (to `main`), `pull_request`
  - 실행: install → lint → typecheck → tests → build
  - E2E(Playwright)는 기본 CI에서 제외 (느리고 환경 의존성이 커서 PR마다 돌리지 않음)

- E2E(선택 실행): `.github/workflows/e2e.yml`
  - 트리거: `workflow_dispatch`
  - 실행: `npm test` (Playwright)

### 로컬에서 동일하게 실행

프로젝트 루트:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

> 참고: 현재 ESLint는 아직 설정되어 있지 않아 `lint`는 “skip” 메시지만 출력합니다.

---

## Logging / Monitoring (Internal-only)

### Backend

- **logger**: `pino`
- **request correlation id**
  - 요청 헤더 `X-Request-Id`가 있으면 사용, 없으면 서버가 생성(UUID)
  - 응답/바디에는 포함하지 않음 (log only)
- **request log**: method/path/status/duration + requestId
- **error log**: 에러 미들웨어에서 stack 포함 내부 로깅 (응답은 기존과 동일)
- **LOG_LEVEL**: `LOG_LEVEL=debug|info|warn|error` (기본 `info`)

예시(요약):
- `request`: `{ requestId, method, path, status, durationMs }`
- `unhandled_error`: `{ requestId, err }`

### Frontend

- 전역 에러 캡처:
  - `window.error`
  - `unhandledrejection`
- 출력: 브라우저 `console.error` (UI 변화 없음)


