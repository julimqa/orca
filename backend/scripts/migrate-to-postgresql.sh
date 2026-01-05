#!/bin/bash

# SQLite에서 PostgreSQL로 마이그레이션 스크립트
# 사용법: ./scripts/migrate-to-postgresql.sh

set -e

echo "🚀 PostgreSQL 마이그레이션을 시작합니다..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. .env 파일 확인
echo "📝 1단계: 환경변수 확인"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다. env.example을 복사합니다...${NC}"
    cp env.example .env
    echo -e "${RED}❗ .env 파일의 DATABASE_URL을 수정해주세요!${NC}"
    echo "   현재: file:./dev.db"
    echo "   변경: postgresql://postgres:postgres@localhost:5432/tms_dev"
    echo ""
    read -p "수정을 완료하셨나요? (y/N): " confirm
    if [ "$confirm" != "y" ]; then
        echo "마이그레이션을 취소합니다."
        exit 1
    fi
fi
echo -e "${GREEN}✅ 환경변수 확인 완료${NC}"
echo ""

# 2. PostgreSQL 실행 확인
echo "🐘 2단계: PostgreSQL 연결 확인"
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PostgreSQL이 실행되지 않았습니다.${NC}"
    echo "Docker로 PostgreSQL을 시작하시겠습니까?"
    read -p "(프로젝트 루트에 docker-compose.yml 필요) (y/N): " docker_confirm
    if [ "$docker_confirm" = "y" ]; then
        cd ..
        docker-compose up -d postgres
        echo "PostgreSQL이 시작될 때까지 대기 중..."
        sleep 5
        cd backend
    else
        echo -e "${RED}❌ PostgreSQL이 필요합니다. 설치하거나 Docker를 사용하세요.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ PostgreSQL 연결 확인 완료${NC}"
echo ""

# 3. 기존 SQLite 마이그레이션 백업
echo "💾 3단계: 기존 마이그레이션 백업"
if [ -d "prisma/migrations" ]; then
    timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p prisma/migrations_backup
    cp -r prisma/migrations "prisma/migrations_backup/sqlite_$timestamp"
    rm -rf prisma/migrations
    echo -e "${GREEN}✅ 기존 마이그레이션 백업 완료: prisma/migrations_backup/sqlite_$timestamp${NC}"
else
    echo -e "${YELLOW}⚠️  기존 마이그레이션이 없습니다.${NC}"
fi
echo ""

# 4. Prisma Client 재생성
echo "🔧 4단계: Prisma Client 재생성"
npm run prisma:generate
echo -e "${GREEN}✅ Prisma Client 재생성 완료${NC}"
echo ""

# 5. 새 마이그레이션 생성
echo "📦 5단계: PostgreSQL 마이그레이션 생성"
npx prisma migrate dev --name init_postgresql
echo -e "${GREEN}✅ 마이그레이션 생성 완료${NC}"
echo ""

# 6. Seed 데이터 추가
echo "🌱 6단계: Seed 데이터 추가"
read -p "기본 계정(관리자, 테스트 계정)을 생성하시겠습니까? (Y/n): " seed_confirm
if [ "$seed_confirm" != "n" ]; then
    npm run prisma:seed
    echo -e "${GREEN}✅ Seed 데이터 추가 완료${NC}"
else
    echo "Seed 데이터 추가를 건너뜁니다."
fi
echo ""

# 7. 완료 메시지
echo "🎉 PostgreSQL 마이그레이션이 완료되었습니다!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 다음 단계:"
echo "1. 서버 실행: npm run dev"
echo "2. 데이터 확인: npm run prisma:studio"
echo "3. Git 커밋: git add . && git commit -m 'feat: Switch to PostgreSQL'"
echo ""
echo "📝 Railway 배포는 RAILWAY_POSTGRESQL_SETUP.md를 참고하세요."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

