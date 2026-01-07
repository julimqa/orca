-- AlterTable
ALTER TABLE "plan_items" ADD COLUMN     "defects" TEXT;

-- CreateTable
CREATE TABLE "report_share_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "report_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_share_links_token_key" ON "report_share_links"("token");

-- CreateIndex
CREATE INDEX "report_share_links_planId_idx" ON "report_share_links"("planId");

-- CreateIndex
CREATE INDEX "report_share_links_expiresAt_idx" ON "report_share_links"("expiresAt");

-- AddForeignKey
ALTER TABLE "report_share_links" ADD CONSTRAINT "report_share_links_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
