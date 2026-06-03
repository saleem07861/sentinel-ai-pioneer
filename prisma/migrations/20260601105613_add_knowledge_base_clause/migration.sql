-- CreateTable
CREATE TABLE "KnowledgeBaseClause" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceDocument" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseClause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeBaseClause_organisationId_idx" ON "KnowledgeBaseClause"("organisationId");

-- CreateIndex
CREATE INDEX "KnowledgeBaseClause_organisationId_category_idx" ON "KnowledgeBaseClause"("organisationId", "category");

-- CreateIndex
CREATE INDEX "KnowledgeBaseClause_category_idx" ON "KnowledgeBaseClause"("category");

-- AddForeignKey
ALTER TABLE "KnowledgeBaseClause" ADD CONSTRAINT "KnowledgeBaseClause_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseClause" ADD CONSTRAINT "KnowledgeBaseClause_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;
