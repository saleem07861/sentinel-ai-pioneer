-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('LEGAL', 'SALES', 'FINANCE', 'HR', 'COMPLIANCE', 'SECURITY', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('ACTIVE', 'PLANNED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'REVIEWED', 'APPROVED', 'REJECTED', 'AI_ANALYSED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'UNDER_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClauseStatus" AS ENUM ('STANDARD', 'DEVIATION', 'MISSING', 'ACCEPTABLE', 'FLAGGED');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('DEEPSEEK', 'OPENAI', 'AZURE_OPENAI', 'LOCAL', 'MOCK');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('ACCEPTED', 'REJECTED', 'NEGOTIATED', 'ESCALATED', 'DEFERRED');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationSettings" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "defaultAIProvider" "AIProvider" NOT NULL DEFAULT 'DEEPSEEK',
    "requireHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "auditLoggingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "type" "ModuleType" NOT NULL,
    "status" "ModuleStatus" NOT NULL DEFAULT 'PLANNED',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "moduleId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "riskLevel" "RiskLevel",
    "templateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "templateClause" TEXT,
    "status" "ClauseStatus" NOT NULL DEFAULT 'STANDARD',
    "riskLevel" "RiskLevel",
    "riskNote" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "documentId" TEXT,
    "clauseId" TEXT,
    "provider" "AIProvider" NOT NULL,
    "promptVersion" TEXT,
    "runId" TEXT,
    "confidence" DOUBLE PRECISION,
    "findings" TEXT NOT NULL,
    "suggestedResponse" TEXT,
    "riskLevel" "RiskLevel",
    "tokensUsed" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanDecision" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "decidedById" TEXT,
    "outcome" "DecisionOutcome" NOT NULL,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceDecisionId" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "metadata" JSONB,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationSettings_organisationId_key" ON "OrganisationSettings"("organisationId");

-- CreateIndex
CREATE INDEX "Module_organisationId_idx" ON "Module"("organisationId");

-- CreateIndex
CREATE INDEX "Module_organisationId_type_idx" ON "Module"("organisationId", "type");

-- CreateIndex
CREATE INDEX "Template_organisationId_idx" ON "Template"("organisationId");

-- CreateIndex
CREATE INDEX "Template_moduleId_idx" ON "Template"("moduleId");

-- CreateIndex
CREATE INDEX "Document_organisationId_idx" ON "Document"("organisationId");

-- CreateIndex
CREATE INDEX "Document_moduleId_idx" ON "Document"("moduleId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_riskLevel_idx" ON "Document"("riskLevel");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_templateId_idx" ON "Document"("templateId");

-- CreateIndex
CREATE INDEX "Document_organisationId_status_idx" ON "Document"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Document_organisationId_riskLevel_idx" ON "Document"("organisationId", "riskLevel");

-- CreateIndex
CREATE INDEX "Clause_organisationId_idx" ON "Clause"("organisationId");

-- CreateIndex
CREATE INDEX "Clause_documentId_idx" ON "Clause"("documentId");

-- CreateIndex
CREATE INDEX "Clause_status_idx" ON "Clause"("status");

-- CreateIndex
CREATE INDEX "Clause_riskLevel_idx" ON "Clause"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "AIAnalysis_runId_key" ON "AIAnalysis"("runId");

-- CreateIndex
CREATE INDEX "AIAnalysis_organisationId_idx" ON "AIAnalysis"("organisationId");

-- CreateIndex
CREATE INDEX "AIAnalysis_documentId_idx" ON "AIAnalysis"("documentId");

-- CreateIndex
CREATE INDEX "AIAnalysis_clauseId_idx" ON "AIAnalysis"("clauseId");

-- CreateIndex
CREATE INDEX "AIAnalysis_riskLevel_idx" ON "AIAnalysis"("riskLevel");

-- CreateIndex
CREATE INDEX "HumanDecision_organisationId_idx" ON "HumanDecision"("organisationId");

-- CreateIndex
CREATE INDEX "HumanDecision_analysisId_idx" ON "HumanDecision"("analysisId");

-- CreateIndex
CREATE INDEX "HumanDecision_decidedById_idx" ON "HumanDecision"("decidedById");

-- CreateIndex
CREATE INDEX "HumanDecision_organisationId_outcome_idx" ON "HumanDecision"("organisationId", "outcome");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_organisationId_idx" ON "KnowledgeEntry"("organisationId");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_moduleId_idx" ON "KnowledgeEntry"("moduleId");

-- CreateIndex
CREATE INDEX "Person_organisationId_idx" ON "Person"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_organisationId_email_key" ON "Person"("organisationId", "email");

-- CreateIndex
CREATE INDEX "AuditLog_organisationId_idx" ON "AuditLog"("organisationId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "OrganisationSettings" ADD CONSTRAINT "OrganisationSettings_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "Clause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanDecision" ADD CONSTRAINT "HumanDecision_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanDecision" ADD CONSTRAINT "HumanDecision_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AIAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanDecision" ADD CONSTRAINT "HumanDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_sourceDecisionId_fkey" FOREIGN KEY ("sourceDecisionId") REFERENCES "HumanDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
