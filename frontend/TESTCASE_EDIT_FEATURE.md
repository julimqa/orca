# 테스트 케이스 편집 기능 (Rich Text 지원)

## 개요
Test Case 페이지에 테스트 케이스 생성 및 편집 기능을 구현했습니다. 사용자는 모달을 통해 테스트 케이스의 상세 정보를 입력하고 수정할 수 있으며, 리치 텍스트 에디터를 통해 서식과 링크를 적용할 수 있습니다.

## 주요 기능

### 1. 테스트 케이스 생성/편집 모달 (`TestCaseFormModal.tsx`)
- **위치**: `frontend/src/components/TestCaseFormModal.tsx`
- **모드**:
  - **Create Mode**: "Add Case" 버튼 클릭 시 빈 폼으로 열림
  - **Edit Mode**: 테이블 행 클릭 또는 메뉴의 "Edit" 선택 시 기존 데이터가 로드된 상태로 열림

### 2. 필드 구성
- **Title** (필수): 테스트 케이스 제목 (한 줄 텍스트)
- **Priority**: 우선순위 (Low / Medium / High) - 드롭다운 선택
- **Preconditions**: 사전 조건 (리치 텍스트 에디터)
- **Steps**: 테스트 단계 (리치 텍스트 에디터)
- **Expected Result**: 예상 결과 (리치 텍스트 에디터)

### 3. 리치 텍스트 에디터 기능
- **텍스트 서식**: Bold, Italic, Underline
- **리스트**: Bullet List, Numbered List
- **링크**: URL 입력 시 자동 인식 (Auto-link), 새 창에서 열기

### 4. UI/UX
- **모달 디자인**:
  - 화면 중앙 정렬 (최대 폭 768px)
  - 반투명 배경 (Backdrop blur)
  - 부드러운 그림자 효과
- **인터랙션**:
  - ESC 키 또는 배경 클릭 시 모달 닫기
  - 저장 중("Saving...") 버튼 비활성화로 중복 제출 방지
  - 에러 발생 시 붉은색 알림 박스 표시

### 5. 데이터 처리
- **생성**: `POST /api/testcases`
- **수정**: `PATCH /api/testcases/:id`
- 리치 텍스트 데이터는 HTML 형식으로 저장됩니다.

## 사용 방법

### 테스트 케이스 생성
1. Test Cases 페이지 우측 상단의 **"Add Case"** 버튼 클릭
2. 모달에서 Title 및 필요한 정보 입력
3. 리치 텍스트 에디터 툴바를 사용하여 서식 적용
4. **"Save"** 버튼 클릭

### 테스트 케이스 수정
1. 목록에서 수정할 테스트 케이스 클릭 (또는 ⋮ 메뉴 > Edit)
2. 모달에서 내용 수정
3. **"Update"** 버튼 클릭

## 파일 구조

```
frontend/src/
├── components/
│   ├── TestCaseFormModal.tsx    # 생성/편집 모달 컴포넌트
│   └── RichTextEditor.tsx       # 리치 텍스트 에디터 컴포넌트
├── pages/
│   └── TestCasesPage.tsx        # 모달 호출 및 상태 관리
└── api/
    └── testcase.ts              # API 호출 함수 (create/update)
```
