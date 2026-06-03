// Sentinel AI — Clean Seed
// Seeds only organisation, settings, module, people, and templates.
// No documents, clauses, knowledge base entries, or knowledge entries.
// Run `npx tsx prisma/seed-full.ts` to restore the full demo dataset.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ModuleType, ModuleStatus, AIProvider } from "@prisma/client";

// Prisma 7 requires a driver adapter at runtime.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const STANDARD_SAAS_TEMPLATE = `STANDARD SAAS AGREEMENT (v2.1)

1. LIABILITY
   Each party's aggregate liability arising out of or related to this
   Agreement shall not exceed two (2) times the total fees paid or payable
   by the Customer in the twelve (12) months preceding the claim.

2. DATA PROCESSING
   The Provider shall process Customer Personal Data solely on documented
   instructions from the Customer and in accordance with applicable data
   protection law (including UK GDPR). The Provider shall implement
   appropriate technical and organisational measures to protect such data.

3. TERMINATION
   Either party may terminate this Agreement for convenience upon thirty (30)
   days' prior written notice. Either party may terminate immediately for
   material breach that remains uncured for fifteen (15) days after notice.

4. INTELLECTUAL PROPERTY
   All intellectual property rights in the Services remain with the Provider.
   The Customer retains all rights in Customer Data. No assignment of IP is
   granted except the limited licence expressly set out herein.

5. CONFIDENTIALITY
   Each party shall keep confidential all Confidential Information of the
   other party and use it only to perform its obligations under this
   Agreement. Obligations survive for three (3) years after termination.

6. GOVERNING LAW
   This Agreement is governed by the laws of England & Wales and the parties
   submit to the exclusive jurisdiction of the courts of England & Wales.`;

const STANDARD_NDA_TEMPLATE = `MUTUAL NON-DISCLOSURE AGREEMENT (v3.0)

1. CONFIDENTIAL INFORMATION DEFINITION
   "Confidential Information" means any information disclosed by one party
   to the other, whether orally or in writing, that is marked as confidential
   or that a reasonable person would understand to be confidential.

2. CONFIDENTIALITY OBLIGATIONS
   The Receiving Party shall hold Confidential Information in strict
   confidence, not disclose it to third parties without consent, limit
   access to employees with a need to know, and use it solely for the
   agreed purpose.

3. EXCLUSIONS
   Confidential Information excludes publicly available information,
   independently developed information, and information received from
   third parties without obligation of confidentiality.

4. TERM AND SURVIVAL
   This Agreement remains in effect for three (3) years. Confidentiality
   obligations survive for five (5) years, or indefinitely for trade secrets.

5. NO LICENCE
   Nothing grants the Receiving Party any rights in the Disclosing Party's
   Confidential Information or intellectual property.

6. GOVERNING LAW
   This Agreement is governed by the laws of England and Wales with
   exclusive jurisdiction of the courts of England and Wales.`;

const STANDARD_DPA_TEMPLATE = `DATA PROCESSING AGREEMENT (v1.0)

1. SUBJECT MATTER AND DURATION
   This DPA governs the processing of Personal Data by Provider on behalf
   of Customer for the duration of the Main Agreement.

2. PROCESSOR OBLIGATIONS
   Provider shall process Personal Data only on documented instructions
   from Customer and implement appropriate technical and organisational
   measures as required by UK GDPR Article 28.

3. SUB-PROCESSORS
   Customer authorises the sub-processors listed in Annex A. Provider shall
   notify Customer of changes at least fourteen (14) days in advance with
   a right to object on reasonable data protection grounds.

4. SECURITY MEASURES
   Provider shall implement: encryption at rest (AES-256) and in transit
   (TLS 1.3), access controls with MFA, regular penetration testing, and
   business continuity plans tested annually.

5. BREACH NOTIFICATION
   Provider shall notify Customer of a Personal Data Breach without undue
   delay and within forty-eight (48) hours of becoming aware.

6. DELETION AND RETURN
   Upon termination, Provider shall delete or return all Personal Data
   within thirty (30) days and certify such deletion in writing.

7. GOVERNING LAW
   This DPA is governed by the laws of England and Wales with exclusive
   jurisdiction of the courts of England and Wales.`;

const STANDARD_PSA_TEMPLATE = `PROFESSIONAL SERVICES AGREEMENT (v1.2)

1. SERVICES
   Provider shall perform the professional services described in each
   Statement of Work ("SOW") agreed between the parties. Each SOW shall
   specify scope, deliverables, timeline, and fees.

2. FEES AND PAYMENT
   Fees shall be calculated on a time-and-materials basis at the rates
   set out in the applicable SOW. Invoices payable within thirty (30)
   days of receipt. All fees exclusive of VAT.

3. INTELLECTUAL PROPERTY
   All IP rights in deliverables created specifically for Customer shall
   vest in Customer upon full payment. Provider retains ownership of its
   pre-existing tools, methodologies, and know-how.

4. LIMITATION OF LIABILITY
   Provider's aggregate liability shall not exceed the total fees paid
   for the specific SOW giving rise to the claim. Standard uncapped
   carve-outs apply (death, fraud, confidentiality, IP, data protection).

5. INSURANCE
   Provider shall maintain Professional Indemnity insurance (£2M per claim),
   Public Liability (£5M per occurrence), and Employer's Liability as
   required by law.

6. TERMINATION
   Either party may terminate for convenience upon thirty (30) days'
   written notice, or immediately for material breach remaining uncured
   for fifteen (15) days.

7. GOVERNING LAW
   This Agreement is governed by the laws of England and Wales with
   exclusive jurisdiction of the courts of England and Wales.`;

const STANDARD_ORDER_FORM_TEMPLATE = `CUSTOMER ORDER FORM (v2.0)

1. PRODUCTS AND SERVICES
   Customer orders the products and services described in the attached
   Schedule. Provider shall make the Products available in accordance
   with the Standard SaaS Agreement incorporated by reference.

2. FEES
   Fees are set out in the Schedule, exclusive of VAT. Fees are fixed
   for the Initial Term and may be increased on renewal with sixty (60)
   days' prior written notice.

3. PAYMENT TERMS
   Invoices payable within thirty (30) days. Late payments bear interest
   at 4% per annum above the Bank of England base rate. Access may be
   suspended if payment is not received within fifteen (15) days of a
   written reminder.

4. TERM
   Initial Term as specified in the Schedule. Auto-renews for successive
   twelve (12) month periods unless either party gives ninety (90) days'
   written notice of non-renewal before the end of the current term.

5. INCORPORATION
   This Order Form incorporates the Standard SaaS Agreement by reference.
   In the event of conflict, the Order Form prevails to the extent of
   the conflict.`;

const STANDARD_RESELLER_TEMPLATE = `RESELLER / CHANNEL PARTNER AGREEMENT (v1.1)

1. APPOINTMENT
   Provider appoints Reseller as a non-exclusive authorised reseller of the
   Products in the Territory (United Kingdom). Reseller has no authority to
   bind Provider to any contract.

2. RESELLER OBLIGATIONS
   Reseller shall promote and market the Products in accordance with
   Provider's brand guidelines, provide first-line technical support,
   maintain accurate sales records, and comply with all applicable laws.

3. IP AND BRANDING
   Provider owns all IP rights in the Products. Reseller is granted a
   limited licence to use Provider's trademarks solely for marketing the
   Products in the Territory, in accordance with brand guidelines.

4. FEES AND COMMISSION
   Reseller pays Provider the wholesale price per Product. Provider pays
   Reseller 25% commission on net licence revenue from registered leads.
   Commissions paid quarterly within forty-five (45) days of quarter-end.

5. LIMITATION OF LIABILITY
   Each party's aggregate liability shall not exceed one (1) times the
   total commission paid to Reseller in the preceding twelve (12) months.
   Standard uncapped carve-outs apply.

6. TERM AND TERMINATION
   Initial term of twelve (12) months, auto-renewing unless either party
   gives ninety (90) days' written notice. Either party may terminate
   immediately for material breach or insolvency.

7. GOVERNING LAW
   This Agreement is governed by the laws of England and Wales with
   exclusive jurisdiction of the courts of England and Wales.`;

async function main() {
  // --- Organisation -------------------------------------------------------
  const org = await prisma.organisation.upsert({
    where: { slug: "meridian-legal" },
    update: { name: "Meridian Legal LLP", isActive: true },
    create: {
      name: "Meridian Legal LLP",
      slug: "meridian-legal",
      description: "Boutique commercial law firm specialising in technology and SaaS contracts.",
      isActive: true,
    },
  });

  // --- Organisation settings ---------------------------------------------
  await prisma.organisationSettings.upsert({
    where: { organisationId: org.id },
    update: {
      defaultAIProvider: AIProvider.DEEPSEEK,
      requireHumanApproval: true,
      auditLoggingEnabled: true,
      timezone: "Europe/London",
    },
    create: {
      organisationId: org.id,
      defaultAIProvider: AIProvider.DEEPSEEK,
      requireHumanApproval: true,
      auditLoggingEnabled: true,
      timezone: "Europe/London",
    },
  });

  // --- Clean ALL child records — leave org, settings, people, and templates ---
  await prisma.auditLog.deleteMany({ where: { organisationId: org.id } });
  await prisma.humanDecision.deleteMany({ where: { organisationId: org.id } });
  await prisma.aIAnalysis.deleteMany({ where: { organisationId: org.id } });
  await prisma.clause.deleteMany({ where: { organisationId: org.id } });
  await prisma.document.deleteMany({ where: { organisationId: org.id } });
  await prisma.knowledgeEntry.deleteMany({ where: { organisationId: org.id } });
  await prisma.knowledgeBaseClause.deleteMany({ where: { organisationId: org.id } });

  // --- Module: Legal ------------------------------------------------------
  const legalModule = await prisma.module.upsert({
    where: { id: (await prisma.module.findFirst({ where: { organisationId: org.id, type: ModuleType.LEGAL } }))?.id ?? "__none__" },
    update: { status: ModuleStatus.ACTIVE, name: "Legal", isActive: true },
    create: {
      organisationId: org.id,
      type: ModuleType.LEGAL,
      status: ModuleStatus.ACTIVE,
      name: "Legal",
      description: "Contract review, clause analysis, and risk assessment.",
      isActive: true,
    },
  });

  // --- People -------------------------------------------------------------
  await prisma.person.upsert({
    where: { organisationId_email: { organisationId: org.id, email: "sarah@meridian.legal" } },
    update: { firstName: "Sarah", lastName: "Okafor", jobTitle: "Partner", role: "teamLeader", password: "admin123", isActive: true },
    create: { organisationId: org.id, firstName: "Sarah", lastName: "Okafor", email: "sarah@meridian.legal", jobTitle: "Partner", role: "teamLeader", password: "admin123", isActive: true },
  });

  await prisma.person.upsert({
    where: { organisationId_email: { organisationId: org.id, email: "james@meridian.legal" } },
    update: { firstName: "James", lastName: "Whitfield", jobTitle: "Associate", role: "associate", password: "admin123", isActive: true },
    create: { organisationId: org.id, firstName: "James", lastName: "Whitfield", email: "james@meridian.legal", jobTitle: "Associate", role: "associate", password: "admin123", isActive: true },
  });

  await prisma.person.upsert({
    where: { organisationId_email: { organisationId: org.id, email: "priya@meridian.legal" } },
    update: { firstName: "Priya", lastName: "Nair", jobTitle: "Legal Operations", role: "associate", password: "admin123", isActive: true },
    create: { organisationId: org.id, firstName: "Priya", lastName: "Nair", email: "priya@meridian.legal", jobTitle: "Legal Operations", role: "associate", password: "admin123", isActive: true },
  });

  // --- Template: Standard SaaS Agreement ----------------------------------
  const existingTemplate = await prisma.template.findFirst({
    where: { organisationId: org.id, name: "Standard SaaS Agreement" },
  });
  existingTemplate
    ? await prisma.template.update({
        where: { id: existingTemplate.id },
        data: { version: "v2.1", content: STANDARD_SAAS_TEMPLATE, isActive: true, moduleId: legalModule.id },
      })
    : await prisma.template.create({
        data: {
          organisationId: org.id,
          moduleId: legalModule.id,
          name: "Standard SaaS Agreement",
          description: "Firm-standard SaaS contract used as the comparison baseline for incoming agreements.",
          version: "v2.1",
          content: STANDARD_SAAS_TEMPLATE,
          isActive: true,
        },
      });

  // --- Additional Templates ------------------------------------------------
  const templateDefs = [
    { name: "Standard Mutual NDA", version: "v3.0", description: "Mutual non-disclosure agreement for pre-engagement confidentiality.", content: STANDARD_NDA_TEMPLATE },
    { name: "Standard Data Processing Agreement", version: "v1.0", description: "UK GDPR-compliant DPA for SaaS and services engagements.", content: STANDARD_DPA_TEMPLATE },
    { name: "Standard Professional Services Agreement", version: "v1.2", description: "Professional services and consulting agreement with SOW framework.", content: STANDARD_PSA_TEMPLATE },
    { name: "Standard Customer Order Form", version: "v2.0", description: "Order form incorporating the SaaS Agreement by reference.", content: STANDARD_ORDER_FORM_TEMPLATE },
    { name: "Standard Reseller Agreement", version: "v1.1", description: "Reseller and channel partner agreement with commission structure.", content: STANDARD_RESELLER_TEMPLATE },
  ];

  for (const def of templateDefs) {
    const existing = await prisma.template.findFirst({
      where: { organisationId: org.id, name: def.name },
    });
    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: { version: def.version, content: def.content, description: def.description, isActive: true, moduleId: legalModule.id },
      });
    } else {
      await prisma.template.create({
        data: { organisationId: org.id, moduleId: legalModule.id, name: def.name, description: def.description, version: def.version, content: def.content, isActive: true },
      });
    }
  }

  // --- Clean slate — no documents, clauses, or knowledge entries ----------
  console.log("Clean seed complete:");
  console.log(`  Organisation: ${org.name} (${org.slug})`);
  console.log(`  Module:       Legal [ACTIVE]`);
  console.log(`  People:       Sarah Okafor, James Whitfield, Priya Nair`);
  console.log(`  Templates:    6 (SaaS, NDA, DPA, PSA, Order Form, Reseller)`);
  console.log(`  Documents:    0 (clean — ready for testing)`);
  console.log(`  KB Clauses:   0 (clean)`);
  console.log(`  Knowledge:    0 (clean)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
