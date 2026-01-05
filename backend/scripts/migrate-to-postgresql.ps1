# SQLite에서 PostgreSQL로 마이그레이션 스크립트 (Windows PowerShell)
# 사용법: .\scripts\migrate-to-postgresql.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 PostgreSQL 마이그레이션을 시작합니다..." -ForegroundColor Cyan
Write-Host ""

# 1. .env 파일 확인
Write-Host "📝 1단계: 환경변수 확인" -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env 파일이 없습니다. env.example을 복사합니다..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host "❗ .env 파일의 DATABASE_URL을 수정해주세요!" -ForegroundColor Red
    Write-Host "   현재: file:./dev.db"
    Write-Host "   변경: postgresql://postgres:postgres@localhost:5432/tms_dev"
    Write-Host ""
    $confirm = Read-Host "수정을 완료하셨나요? (y/N)"
    if ($confirm -ne "y") {
        Write-Host "마이그레이션을 취소합니다." -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ 환경변수 확인 완료" -ForegroundColor Green
Write-Host ""

# 2. PostgreSQL 실행 확인
Write-Host "🐘 2단계: PostgreSQL 연결 확인" -ForegroundColor Yellow
try {
    $null = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    Write-Host "✅ PostgreSQL 연결 확인 완료" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PostgreSQL이 실행되지 않았습니다." -ForegroundColor Yellow
    Write-Host "Docker로 PostgreSQL을 시작하시겠습니까?"
    $dockerConfirm = Read-Host "(프로젝트 루트에 docker-compose.yml 필요) (y/N)"
    if ($dockerConfirm -eq "y") {
        Set-Location ..
        docker-compose up -d postgres
        Write-Host "PostgreSQL이 시작될 때까지 대기 중..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        Set-Location backend
        Write-Host "✅ PostgreSQL 시작 완료" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL이 필요합니다. 설치하거나 Docker를 사용하세요." -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# 3. 기존 SQLite 마이그레이션 백업
Write-Host "💾 3단계: 기존 마이그레이션 백업" -ForegroundColor Yellow
if (Test-Path "prisma\migrations") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    New-Item -ItemType Directory -Path "prisma\migrations_backup" -Force | Out-Null
    Copy-Item -Path "prisma\migrations" -Destination "prisma\migrations_backup\sqlite_$timestamp" -Recurse
    Remove-Item -Path "prisma\migrations" -Recurse -Force
    Write-Host "✅ 기존 마이그레이션 백업 완료: prisma\migrations_backup\sqlite_$timestamp" -ForegroundColor Green
} else {
    Write-Host "⚠️  기존 마이그레이션이 없습니다." -ForegroundColor Yellow
}
Write-Host ""

# 4. Prisma Client 재생성
Write-Host "🔧 4단계: Prisma Client 재생성" -ForegroundColor Yellow
npm run prisma:generate
Write-Host "✅ Prisma Client 재생성 완료" -ForegroundColor Green
Write-Host ""

# 5. 새 마이그레이션 생성
Write-Host "📦 5단계: PostgreSQL 마이그레이션 생성" -ForegroundColor Yellow
npx prisma migrate dev --name init_postgresql
Write-Host "✅ 마이그레이션 생성 완료" -ForegroundColor Green
Write-Host ""

# 6. Seed 데이터 추가
Write-Host "🌱 6단계: Seed 데이터 추가" -ForegroundColor Yellow
$seedConfirm = Read-Host "기본 계정(관리자, 테스트 계정)을 생성하시겠습니까? (Y/n)"
if ($seedConfirm -ne "n") {
    npm run prisma:seed
    Write-Host "✅ Seed 데이터 추가 완료" -ForegroundColor Green
} else {
    Write-Host "Seed 데이터 추가를 건너뜁니다." -ForegroundColor Yellow
}
Write-Host ""

# 7. 완료 메시지
Write-Host "🎉 PostgreSQL 마이그레이션이 완료되었습니다!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 다음 단계:"
Write-Host "1. 서버 실행: npm run dev"
Write-Host "2. 데이터 확인: npm run prisma:studio"
Write-Host "3. Git 커밋: git add . ; git commit -m 'feat: Switch to PostgreSQL'"
Write-Host ""
Write-Host "📝 Railway 배포는 RAILWAY_POSTGRESQL_SETUP.md를 참고하세요."
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

