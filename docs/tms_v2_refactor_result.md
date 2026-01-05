# TMS_v2 → ORCA 리팩토링 결과 정리 (로컬 폴더 비교)

비교 대상:
- `TMS_v2` (레거시/이전 구조)
- `ORCA` (워크스페이스 SSOT로 정리된 구조)

> 이 문서는 “로컬에 존재하는 두 폴더”를 기준으로 비교한 결과입니다.  
> (즉, **git 추적 여부와 무관하게** 디스크에 존재하는 파일/설정도 포함될 수 있습니다.)

---

## 핵심 결론

- **ORCA**: `npm workspaces`를 전제로 한 **모노레포 운영(단일 `package-lock.json` SSOT + `npm -w` 기반 스크립트)** 로 정리됨
- **TMS_v2**: 소스 외에 **빌드 산출물(`dist/`), 로컬 상태(`.env`, `dev.db`) 및 중복 락파일**이 함께 존재하는 상태

---

## 1) 레포/브랜치/원격 상태 (Git 관점)

| 항목 | TMS_v2 | ORCA |
|---|---|---|
| **Git 레포 여부** | 예 | 예 |
| **현재 브랜치** | `refactoring-intergration` | `main` |
| **원격(remote)** | `origin=https://github.com/koesnuj/TMS_v2` + `orca=https://github.com/koesnuj/ORCA.git` | `origin=https://github.com/koesnuj/ORCA.git` |
| **원격 추적 상태** | `orca/main` 대비 **behind 5** | `origin/main`과 동기 |

의미:
- 리팩토링 작업 브랜치가 **ORCA 원격을 추적**하도록 구성되어 있고, 로컬 브랜치가 원격보다 **5커밋 뒤**인 상태입니다.

---

## 2) 폴더 구조 (구성요소 비교)

| 구성요소 | TMS_v2 | ORCA | 비고 |
|---|---:|---:|---|
| `backend/` | O | O | Express + TypeScript + Prisma |
| `frontend/` | O | O | React + Vite + Tailwind |
| `packages/shared/` | O | O | 공용 타입/유틸(워크스페이스) |
| `tests/` | O | O | Playwright E2E |
| `scripts/` | O | O | PowerShell 중심 부트스트랩/DB 스크립트 |
| `docker-compose.yml` | O | O | Postgres 컨테이너 구성 **동일** |
| `playwright.config.ts` | O | O | 설정 내용 **동일**(서버 자동 기동 포함) |

---

## 3) 설치/의존성 정책 (가장 큰 리팩토링 포인트)

### 3.1 워크스페이스 정의(루트 `package.json`)

| 항목 | TMS_v2 | ORCA | 효과 |
|---|---|---|---|
| **workspaces** | `["packages/*"]` | `["frontend","backend","packages/*"]` | ORCA는 모노레포가 “공식적으로” 묶여 **루트 1회 설치/관리**에 최적 |
| **루트 스크립트 호출 방식** | `npm -C frontend ...` / `npm -C backend ...` | `npm -w frontend ...` / `npm -w backend ...` | ORCA는 워크스페이스 기반이라 **CI/로컬 동작 일치**에 유리 |

### 3.2 락파일(SSOT) 정책

| 항목 | TMS_v2 | ORCA | 의미/장단점 |
|---|---|---|---|
| **`package-lock.json` 개수** | 3개 (루트 + `backend/` + `frontend/`) | 1개 (루트만) | ORCA는 **단일 소스 오브 트루스(SSOT)** 로 재현성이 높음 |
| **권장 설치 방식** | (폴더별 설치 유도 가능성↑) | 루트에서 `npm ci` 1회 기준 | ORCA는 “루트에서 한 번에”가 원칙이라 **불일치/드리프트 감소** |

---

## 4) 산출물/로컬 상태 포함 여부 (클린 트리 관점)

| 항목 | TMS_v2 | ORCA | 의미 |
|---|---|---|---|
| `backend/dist/**` | O | (로컬 기준) 없음 | TMS_v2는 **컴파일 산출물**이 함께 존재 |
| `frontend/dist/**` | O | (로컬 기준) 없음 | TMS_v2는 **프론트 빌드 산출물**이 함께 존재 |
| `packages/shared/dist/**` | O | (로컬 기준) 없음 | TMS_v2는 shared 패키지의 **빌드 결과물**도 포함 |
| `backend/prisma/dev.db` | O | (로컬 기준) 없음 | 로컬 SQLite DB 파일(운영 DB는 Postgres/Prisma로 보임) |
| `backend/.env`, `frontend/.env` | O | (로컬 기준) 없음 | **로컬 시크릿/환경 값**이 폴더에 존재 |
| `node_modules/` | O | O | 두 폴더 모두 로컬에 설치 흔적이 있음(비교 시 제외 필요) |

해석:
- ORCA 구성은 “소스 중심 + 재현 가능한 설치”에 유리하고,
- TMS_v2는 “바로 실행/데모”는 편하지만, **추적/배포/동기화 시 불필요한 변화(diff) 유발** 가능성이 큽니다.

---

## 5) 백엔드/프론트 의존성 레이어 정리

| 항목 | TMS_v2 | ORCA | 해석 |
|---|---|---|---|
| **backend 의존성** | `@dnd-kit/*`, `lucide-react` 등 “프론트 성격” deps가 섞여 있음 | 해당 deps가 제거되어 더 정돈됨 | ORCA 쪽이 **서버/클라 역할 분리**가 명확 |
| **frontend 의존성** | 동일(관찰 범위 내) | 동일(관찰 범위 내) | 주요 스택은 동일 |

---

## 6) 스크립트/가드레일(검증 단계) 차이

| 항목 | TMS_v2 | ORCA | 비고 |
|---|---|---|---|
| `scripts/verify-react-security.cjs` | X | O | ORCA에만 존재: 프론트 보안 점검/가드레일 성격 |
| 부트스트랩 스크립트 | O | O | `bootstrap_phase0_safety.ps1`, `start_postgres.ps1` 등 존재 |

---

## 7) 테스트/실행 구성(동일점)

| 항목 | TMS_v2 | ORCA | 비고 |
|---|---|---|---|
| **Playwright** | O | O | `webServer`로 백엔드/프론트 자동 기동 (포트: 3001/5173) |
| **backend 단위 테스트(vitest)** | O | O | `vitest run` |
| **frontend 단위 테스트(vitest)** | O | O | `vitest` / `vitest run` |
| **docker(Postgres)** | O | O | `tms_dev` DB, 5432 매핑 |

---

## 8) 리팩토링 “결과”를 한 문장으로

**TMS_v2를 ORCA 방식으로 리팩토링한 결과는**  
“프로젝트를 `npm workspaces` 중심으로 재구성하고(backend/frontend 포함), `package-lock.json`을 루트 1개로 통일하여 설치/빌드/검증의 재현성을 올리고, 백엔드 의존성을 정리해 레이어 경계를 더 명확하게 만든 것”으로 요약할 수 있습니다.


