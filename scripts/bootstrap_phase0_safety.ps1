<# 
  Phase0 Safety 브랜치 개발환경 부트스트랩 스크립트 (Windows PowerShell)

  하는 일:
  - (권장) 루트에서 npm ci 1회 (워크스페이스 SSOT)
  - backend/.env 생성 및 DATABASE_URL 로컬 docker-compose(Postgres) 기본값으로 세팅
  - (신규 .env 생성 시) JWT_SECRET 자동 생성
  - docker compose(up -d postgres)로 DB 기동 (docker 필요)
  - Prisma migrate deploy + seed
  - (옵션) 백/프 dev 서버 실행 안내

  사용:
    PowerShell에서 프로젝트 루트(TMS_v2)에서 실행:
      .\scripts\bootstrap_phase0_safety.ps1

    DB만 준비하고 싶으면:
      .\scripts\bootstrap_phase0_safety.ps1 -SkipFrontend -SkipRoot
#>

[CmdletBinding()]
param(
  [switch]$SkipRoot,
  [switch]$SkipBackend,
  [switch]$SkipFrontend,
  [switch]$SkipMigrate,
  [switch]$SkipSeed,
  [ValidateSet("auto","docker","podman")]
  [string]$ContainerEngine = "auto"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Assert-Command([string]$name, [string]$installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "❌ '$name' 명령을 찾지 못했습니다." -ForegroundColor Red
    if ($installHint) {
      Write-Host "   $installHint" -ForegroundColor Yellow
    }
    throw "Missing dependency: $name"
  }
}

Write-Step "필수 도구 확인 (node/npm)"
Assert-Command "node" "Node.js를 설치해주세요. (권장: LTS)"
Assert-Command "npm"  "Node.js 설치 시 npm이 함께 설치됩니다."

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $SkipRoot) {
  Write-Step "워크스페이스 의존성 설치 (루트 1회): npm ci"
  npm ci
}

if (-not $SkipBackend) {
  Write-Step "backend/.env 준비"
  Push-Location "backend"

  $isNewEnv = -not (Test-Path ".env")
  if ($isNewEnv) {
    Copy-Item "env.example" ".env"
  }

  # docker-compose.yml 기본값에 맞춤 (항상 맞춰서 사용)
  $content = Get-Content ".env"
  $content = $content | ForEach-Object { $_ -replace '^DATABASE_URL=.*$','DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tms_dev"' }

  # 신규 .env 생성 시에만 JWT_SECRET 자동 생성(기존 환경값을 덮어쓰지 않음)
  if ($isNewEnv) {
    $jwtBytes = 1..32 | ForEach-Object { Get-Random -Maximum 256 }
    $jwt = [Convert]::ToBase64String([byte[]]$jwtBytes)
    $content = $content | ForEach-Object {
      if ($_ -match '^JWT_SECRET=.*$') { 'JWT_SECRET="' + $jwt + '"' } else { $_ }
    }
  }

  $content | Set-Content ".env"
  Pop-Location
}

if (-not $SkipMigrate -or -not $SkipSeed) {
  Write-Step "PostgreSQL 컨테이너 기동 (Docker 또는 Podman)"
  # ✅ 유지되는 엔트리포인트(호환성): bootstrap_phase0_safety.ps1는 그대로 사용
  # 내부 구현은 `scripts/bootstrap.ps1`(캐노니컬 부트스트랩)로 위임합니다.
  & "$root\scripts\bootstrap.ps1" -Engine $ContainerEngine

  Write-Step "DB 마이그레이션/시드"
  Push-Location "backend"

  if (-not $SkipMigrate) {
    npm run prisma:migrate:deploy
  }
  if (-not $SkipSeed) {
    npm run prisma:seed
  }

  Pop-Location
}

Write-Step "완료"
Write-Host "백엔드 실행:  cd backend  ; npm run dev" -ForegroundColor Green
Write-Host "프론트 실행:  cd frontend ; npm run dev" -ForegroundColor Green
Write-Host "기본 계정: admin@tms.com / admin123!" -ForegroundColor Green


