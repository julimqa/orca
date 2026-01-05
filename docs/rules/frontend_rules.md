
# 🎨 Frontend Engineering Rules — AI‑First Rewritten Edition

Applies to: `/frontend/**`

---

## 1. React Architecture

### 1.1 Component Structure
Each component file MUST contain:
- Imports
- Types/interfaces
- Component function
- Hooks
- Helper functions (bottom)

### 1.2 Component Patterns
- Single responsibility
- No business logic in components → use service or API layer
- Pure components unless side effects required
- Prefer React.memo for heavy lists

---

## 2. Tailwind CSS Rules
- Utility-first; avoid custom CSS unless required
- Use `cn()` helper for combined class management
- Support responsive design: mobile-first

---

## 3. State Management
- Local UI state: `useState`
- Shared state: React Context + custom hooks
- No Redux / global stores unless explicitly approved

---

## 4. API Consumption
- All API interactions MUST use `/frontend/src/api/**`
- No fetch/axios inside components
권장:
- React Query는 캐싱/리페치/뮤테이션 관리에 유용하지만, **현재 코드베이스에는 도입되어 있지 않습니다.**
- 필요 시 도입하며, 도입 전까지는 기존 axios API 레이어 패턴을 유지합니다.

---

## 5. Folder Structure (Strict)
```
src/
  components/
  pages/
  hooks/
  api/
  utils/
  types/
```

---

## 6. Testing
- Use RTL + Playwright patterns
- Component tests must mock API calls
- Critical flows MUST include E2E coverage

