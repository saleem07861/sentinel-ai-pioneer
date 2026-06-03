// Clears all uploaded documents, their clauses, AI analyses, human decisions,
// knowledge entries created from decisions, and audit logs.
// Preserves: Organisation, People, Templates, KnowledgeBaseClauses, Modules, Settings.

import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Clearing documents and decisions…");

  // 1. Disconnect knowledge entries from decisions
  const entries = await prisma.knowledgeEntry.updateMany({
    where: { sourceDecisionId: { not: null } },
    data: { sourceDecisionId: null },
  });
  console.log(`  Disconnected ${entries.count} knowledge entries from decisions`);

  // 2. Delete all human decisions (required before AI analyses due to Restrict)
  const decisions = await prisma.humanDecision.deleteMany();
  console.log(`  Deleted ${decisions.count} human decisions`);

  // 3. Delete all AI analyses
  const analyses = await prisma.aIAnalysis.deleteMany();
  console.log(`  Deleted ${analyses.count} AI analyses`);

  // 4. Delete all documents (cascades to clauses)
  const docs = await prisma.document.deleteMany();
  console.log(`  Deleted ${docs.count} documents`);

  // 5. Delete all audit logs
  const logs = await prisma.auditLog.deleteMany();
  console.log(`  Deleted ${logs.count} audit logs`);

  console.log("Done. Templates, approved clauses, and users are preserved.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
