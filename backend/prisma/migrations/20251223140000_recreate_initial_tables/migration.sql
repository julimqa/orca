-- Fix for initial migration formatting issue:
-- Ensure core tables/indexes/FKs exist even if the first migration was applied but created nothing.

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "folders" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "testcases" (
  "id" TEXT NOT NULL,
  "caseNumber" INTEGER,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "precondition" TEXT,
  "steps" TEXT,
  "expectedResult" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "automationType" TEXT NOT NULL DEFAULT 'MANUAL',
  "category" TEXT,
  "sequence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "folderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "testcases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plan_items" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "testCaseId" TEXT NOT NULL,
  "assignee" TEXT,
  "result" TEXT NOT NULL DEFAULT 'NOT_RUN',
  "comment" TEXT,
  "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "testcases_caseNumber_key" ON "testcases"("caseNumber");

DO $$
BEGIN
  ALTER TABLE "folders"
  ADD CONSTRAINT "folders_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "folders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "testcases"
  ADD CONSTRAINT "testcases_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "folders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "plan_items"
  ADD CONSTRAINT "plan_items_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plans"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "plan_items"
  ADD CONSTRAINT "plan_items_testCaseId_fkey"
  FOREIGN KEY ("testCaseId") REFERENCES "testcases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;


