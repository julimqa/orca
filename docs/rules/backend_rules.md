
# ⚙️ Backend Engineering Rules — AI‑First Rewritten Edition

Applies to: `/backend/**`

---

## 1. Architecture
Backend follows strict 3‑layer pattern:
1. **Controller** — HTTP parsing, validation, response formatting  
2. **Service** — business logic  
3. **Prisma** — DB access only

No logic in controllers beyond validation.

---

## 2. Prisma Rules
- All relations MUST use explicit `select` or `include`.
- Transactions required for multi‑update operations.
- Id fields MUST use UUID.

---

## 3. Validation Rules
권장:
- 요청 유효성 검증은 가능한 한 **일관된 방식**(예: Zod)으로 통일합니다.
- 현재 코드베이스는 일부 엔드포인트에서 **수동 검증(if/return)** 패턴을 사용하고 있습니다.

---

## 4. Error Handling
현재 코드베이스 표준:
- `AppError`를 사용하고, 전역 에러 핸들러에서 `{ success: false, message }` 형태로 응답합니다.

```ts
throw new AppError(404, { success: false, message: "Not found" });
```

---

## 5. Folder Structure (Strict)
```
src/
  controllers/
  services/
  middlewares/
  routes/
  utils/
  config/
  prisma/
```

