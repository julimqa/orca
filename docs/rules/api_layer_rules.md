
# 🌐 Frontend API Layer Rules — AI‑First Rewritten Edition

Applies to: `/frontend/src/api/**`

---

## 1. API Client Rules
- Use axios instance ONLY
- Token injection via interceptor
- Auto-handling 401 → logout & redirect

---

## 2. Error Parsing
All API errors MUST be parsed into `ApiException`.

---

## 3. Service Pattern
Each API domain MUST have a separate service:

```
test-cases.service.ts
auth.service.ts
folders.service.ts
```

Services MUST:
- Expose typed DTOs
- (권장) 가능한 범위에서 응답 shape을 검증하거나, 최소한 핵심 필드를 확인합니다.

