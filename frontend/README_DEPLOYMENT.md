# 프론트엔드 배포 가이드

## Vercel 배포 방법

### 1. Vercel에 프로젝트 연결

1. [Vercel](https://vercel.com) 로그인
2. "Add New Project" 클릭
3. GitHub 레포지토리 선택
4. **중요**: Root Directory를 `frontend`로 설정
5. Framework Preset: Vite (자동 감지)

### 2. 환경 변수 설정

Vercel 프로젝트 설정 → Environment Variables에 추가:

```
VITE_API_URL=https://tmsv2-production.up.railway.app/api
```

### 3. 배포

"Deploy" 버튼 클릭!

---

## 로컬에서 프로덕션 빌드 테스트

```bash
# 환경 변수 설정
export VITE_API_URL=https://tmsv2-production.up.railway.app/api

# 또는 .env.local 파일 생성
echo "VITE_API_URL=https://tmsv2-production.up.railway.app/api" > .env.local

# 빌드
npm run build

# 프리뷰
npm run preview
```

---

## 환경별 API URL

- **개발**: `http://localhost:3001/api`
- **프로덕션**: `https://tmsv2-production.up.railway.app/api`

코드에서 자동으로 환경을 감지합니다:
- `VITE_API_URL` 환경 변수가 있으면 우선 사용
- `import.meta.env.PROD`가 true면 Railway URL 사용
- 그 외에는 localhost 사용

