
# 🔥 Global Engineering Rules — AI‑First Rewritten Edition

This document defines the **single authoritative global standard** for development across the entire codebase.  
All subsystem rules (frontend, backend, testing, api-layer, commit) MUST comply with this document unless explicitly overridden.

---

## 1. System Purpose
This project is a **Test Management System (ORCA, TMS_v2 기반)**.  
Architecture:
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Express + Prisma (PostgreSQL)
- Testing: Playwright
  
Note:
- 현재 레포는 **Vite SPA + Express API**를 기준으로 운영됩니다. (Electron 런타임은 현 상태 스코프에 포함되지 않습니다.)

---

## 2. Global Development Principles

### 2.1 Human + AI Co‑Development
- All code MUST be readable and maintainable by both humans and AI.
- Avoid cleverness; prefer explicit logic.
- AI MUST NOT modify unrelated code without explicit permission.

### 2.2 Change Scope Limitation
- A change request MUST only modify files directly related to the requested feature.
- AI MUST output patch/diff format when modifying existing files.
- AI MUST request user confirmation before:
  - Creating new files
  - Deleting or renaming files
  - Performing multi-file refactors

### 2.3 Architecture Consistency
- Follow the existing folder structure; do not introduce new parallel structures.
- Enforce strict separation:
  - UI logic → Frontend
  - Business logic → Backend service layer
  - Data persistence → Prisma

### 2.4 Type Safety
- TypeScript strict mode is mandatory.
- No `any`. No `@ts-ignore` except with explicit justification.

---

## 3. Naming Standards (Global, Applies to All Layers)
| Category | Format | Example |
|---------|--------|---------|
| Files | kebab-case | `test-case-card.tsx` |
| Components | PascalCase | `TestCaseCard` |
| Functions | camelCase | `fetchTestCases()` |
| Constants | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Prisma Models | PascalCase | `TestCase` |
| API routes | kebab-case | `/test-cases/:id` |

---

## 4. Error Model — Universal Spec

### 4.1 Backend → Frontend Error Contract
All backend errors MUST follow this JSON shape:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}
}
```

### 4.2 Frontend MUST parse using a unified error handler.

---

## 5. Code Quality Rules
- DRY, KISS, YAGNI enforced project‑wide.
- Early returns preferred over deep nesting.
- No magic numbers or strings.
- Forbidden:
  - console.log in production code
  - Inline business rules inside components/controllers

---

## 6. Documentation Requirements
Every non-trivial function MUST include:
- Description of purpose
- Parameter description
- Error conditions

Use JSDoc format.

---

## 7. AI Development Rules
AI MUST:
1. Read project structure before answering.
2. Apply subsystem rules (frontend/backend/testing/api-layer) automatically based on file path.
3. Ask clarifying questions when context is missing.
4. Output diffs unless file creation is requested.
5. Avoid large-scale refactors unless explicitly approved.

---

## 8. Rule Precedence
1. User instruction
2. Global rules (this file)
3. Subsystem rules: frontend / backend / testing / api-layer
4. Formatting tools (ESLint, Prettier)
5. AI discretion (when unspecified)

