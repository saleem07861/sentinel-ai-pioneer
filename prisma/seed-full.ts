// Sentinel AI — Seed data
// Phase 2: A realistic demo organisation for the Legal module.
//
// Idempotent: safe to run repeatedly. Uses upsert on stable unique keys
// (slug, organisation+email) and clears child records for the demo org
// before re-creating them so risk levels / clauses stay consistent.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ModuleType, ModuleStatus, AIProvider, DocumentStatus, RiskLevel, ClauseStatus, ReviewStatus } from "@prisma/client";

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

  // --- Clean child records for a deterministic demo state -----------------
  // Order matters: dependents before parents.
  await prisma.humanDecision.deleteMany({ where: { organisationId: org.id } });
  await prisma.aIAnalysis.deleteMany({ where: { organisationId: org.id } });
  await prisma.clause.deleteMany({ where: { organisationId: org.id } });
  await prisma.document.deleteMany({ where: { organisationId: org.id } });
  await prisma.knowledgeBaseClause.deleteMany({ where: { organisationId: org.id } });

  // --- Module: Legal ------------------------------------------------------
  const legalModule = await prisma.module.upsert({
    // No natural unique key on Module; find-or-create by org + type.
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
  const sarah = await prisma.person.upsert({
    where: { organisationId_email: { organisationId: org.id, email: "sarah@meridian.legal" } },
    update: { firstName: "Sarah", lastName: "Okafor", jobTitle: "Partner", role: "teamLeader", password: "partner123", isActive: true },
    create: { organisationId: org.id, firstName: "Sarah", lastName: "Okafor", email: "sarah@meridian.legal", jobTitle: "Partner", role: "teamLeader", password: "partner123", isActive: true },
  });

  const james = await prisma.person.upsert({
    where: { organisationId_email: { organisationId: org.id, email: "james@meridian.legal" } },
    update: { firstName: "James", lastName: "Whitfield", jobTitle: "Associate", role: "associate", password: "associate123", isActive: true },
    create: { organisationId: org.id, firstName: "James", lastName: "Whitfield", email: "james@meridian.legal", jobTitle: "Associate", role: "associate", password: "associate123", isActive: true },
  });

  const priya = await prisma.person.upsert({
    where: { organisationId_email: { organisationId: org.id, email: "priya@meridian.legal" } },
    update: { firstName: "Priya", lastName: "Nair", jobTitle: "Legal Operations", role: "associate", password: "associate123", isActive: true },
    create: { organisationId: org.id, firstName: "Priya", lastName: "Nair", email: "priya@meridian.legal", jobTitle: "Legal Operations", role: "associate", password: "associate123", isActive: true },
  });

  // --- Template: Standard SaaS Agreement ----------------------------------
  // No natural unique key; find-or-create by org + name.
  const existingTemplate = await prisma.template.findFirst({
    where: { organisationId: org.id, name: "Standard SaaS Agreement" },
  });
  const template = existingTemplate
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

  // --- Additional Templates — upsert for idempotent re-seeding --------------
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

  // --- Documents ----------------------------------------------------------
  const acme = await prisma.document.create({
    data: {
      organisationId: org.id,
      moduleId: legalModule.id,
      uploadedById: james.id,
      title: "Acme Corp SaaS Agreement",
      description: "Inbound SaaS agreement from Acme Corp; flagged for elevated risk on review.",
      status: DocumentStatus.UNDER_REVIEW,
      riskLevel: RiskLevel.HIGH,
      templateId: template.id,
      isActive: true,
      metadata: { parties: ["Acme Corp", "Meridian Legal LLP"], contractType: "SaaS Agreement" },
    },
  });

  const brightwave = await prisma.document.create({
    data: {
      organisationId: org.id,
      moduleId: legalModule.id,
      uploadedById: sarah.id,
      title: "Brightwave NDA",
      description: "Mutual non-disclosure agreement with Brightwave; reviewed and cleared.",
      status: DocumentStatus.APPROVED,
      riskLevel: RiskLevel.LOW,
      isActive: true,
      approvedContent: "MUTUAL NON-DISCLOSURE AGREEMENT\n\nCONFIDENTIALITY OBLIGATIONS\nThe Receiving Party shall hold Confidential Information in strict confidence and not disclose it to any third party without prior written consent. Access limited to employees with a need to know.\n\nEXCLUSIONS\nConfidential Information excludes publicly available information, independently developed information, and information received from third parties without obligation.\n\nTERM AND SURVIVAL\nThis Agreement remains in effect for three years. Confidentiality obligations survive for five years, or indefinitely for trade secrets.\n\nNO LICENCE\nNothing grants the Receiving Party any rights in the Disclosing Party's Confidential Information or IP.\n\nGOVERNING LAW\nGoverned by the laws of England and Wales. Exclusive jurisdiction of England and Wales courts.\n\nENTIRE AGREEMENT\nThis Agreement constitutes the entire agreement and supersedes all prior understandings.",
      metadata: { parties: ["Brightwave Solutions Ltd", "Meridian Legal LLP"], contractType: "Mutual Non-Disclosure Agreement" },
    },
  });

  const cloudCore = await prisma.document.create({
    data: {
      organisationId: org.id,
      moduleId: legalModule.id,
      uploadedById: priya.id,
      title: "CloudCore Data Processing Agreement",
      description: "DPA submitted by CloudCore; awaiting initial review.",
      status: DocumentStatus.UNDER_REVIEW,
      riskLevel: RiskLevel.MEDIUM,
      isActive: true,
      metadata: { parties: ["CloudCore Ltd", "Meridian Legal LLP"], contractType: "Data Processing Agreement" },
    },
  });

  // --- Clauses for All 3 Documents -----------------------------------------
  const acmeClauses = [
    {
      orderIndex: 1,
      title: "Liability Cap",
      status: ClauseStatus.DEVIATION,
      templateClause: "Liability limited to 2x annual fees",
      content: "Liability capped at £5,000,000",
      riskNote: "Significantly higher exposure than standard position",
      riskLevel: RiskLevel.HIGH,
    },
    {
      orderIndex: 2,
      title: "Termination",
      status: ClauseStatus.ACCEPTABLE,
      templateClause: "30 days written notice",
      content: "45 days written notice",
      riskNote: "Longer notice period than standard but commercially acceptable",
      riskLevel: RiskLevel.LOW,
    },
    {
      orderIndex: 3,
      title: "IP Ownership",
      status: ClauseStatus.FLAGGED,
      templateClause: "All IP in the Services remains with the Provider; Customer retains Customer Data",
      content: "Provider assigns all IP rights, including in pre-existing materials, to the Customer on payment",
      riskNote: "Assignment of pre-existing IP is unacceptable; must be renegotiated to a licence",
      riskLevel: RiskLevel.CRITICAL,
    },
    {
      orderIndex: 4,
      title: "Data Processing",
      status: ClauseStatus.DEVIATION,
      templateClause: "Processing solely on documented instructions, compliant with UK GDPR",
      content: "Provider may process aggregated data for its own product-improvement purposes",
      riskNote: "Secondary-use clause needs scoping and a UK GDPR lawful-basis review",
      riskLevel: RiskLevel.MEDIUM,
    },
    {
      orderIndex: 5,
      title: "Confidentiality",
      status: ClauseStatus.STANDARD,
      templateClause: "Mutual confidentiality surviving 3 years after termination",
      content: "Mutual confidentiality surviving 3 years after termination",
      riskNote: null,
      riskLevel: RiskLevel.LOW,
    },
    {
      orderIndex: 6,
      title: "Governing Law",
      status: ClauseStatus.MISSING,
      templateClause: "Governed by the laws of England & Wales; exclusive jurisdiction of England & Wales",
      content: "(No governing law clause present in the submitted agreement)",
      riskNote: "No governing law or jurisdiction specified; must be added before signature",
      riskLevel: RiskLevel.HIGH,
    },
  ];

  const brightwaveClauses = [
    {
      orderIndex: 1,
      title: "Confidentiality Obligations",
      status: ClauseStatus.STANDARD,
      templateClause: "Mutual confidentiality obligations with reasonable care standard",
      content: "The Receiving Party shall hold Confidential Information in strict confidence using no less than reasonable care, not disclose to third parties without prior written consent, and limit access to employees with a need to know.",
      riskNote: "Matches approved KB clause",
      riskLevel: RiskLevel.LOW,
    },
    {
      orderIndex: 2,
      title: "Exclusions from Confidential Information",
      status: ClauseStatus.STANDARD,
      templateClause: "Standard exclusions for public, independently developed, and third-party information",
      content: "Confidential Information excludes information that is publicly available, independently developed without use of confidential information, or received from a third party without obligation.",
      riskNote: "Matches approved KB clause",
      riskLevel: RiskLevel.LOW,
    },
    {
      orderIndex: 3,
      title: "NDA Term and Survival",
      status: ClauseStatus.STANDARD,
      templateClause: "3-year term with 5-year survival, indefinite for trade secrets",
      content: "This Agreement shall remain in effect for three years. Confidentiality obligations survive for five years from disclosure, or indefinitely for trade secrets.",
      riskNote: "Matches approved KB clause",
      riskLevel: RiskLevel.LOW,
    },
    {
      orderIndex: 4,
      title: "No Licence",
      status: ClauseStatus.STANDARD,
      templateClause: "No IP rights granted; all Confidential Information remains property of Disclosing Party",
      content: "Nothing in this Agreement grants the Receiving Party any right, title, or interest in the Disclosing Party's Confidential Information. All Confidential Information remains the property of the Disclosing Party.",
      riskNote: "Matches approved KB clause",
      riskLevel: RiskLevel.LOW,
    },
    {
      orderIndex: 5,
      title: "Governing Law",
      status: ClauseStatus.STANDARD,
      templateClause: "Governed by the laws of England & Wales with exclusive jurisdiction",
      content: "This Agreement is governed by the laws of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales.",
      riskNote: "Matches approved KB clause",
      riskLevel: RiskLevel.LOW,
    },
  ];

  const cloudCoreClauses = [
    {
      orderIndex: 1,
      title: "Subject Matter and Duration",
      status: ClauseStatus.DEVIATION,
      templateClause: "DPA governs processing for the duration of the Main Agreement",
      content: "This DPA governs processing for the duration of the Main Agreement and for a period of ten years thereafter for archival purposes.",
      riskNote: "Excessive post-termination retention period — standard is 60 days max",
      riskLevel: RiskLevel.MEDIUM,
    },
    {
      orderIndex: 2,
      title: "Processor Obligations",
      status: ClauseStatus.FLAGGED,
      templateClause: "Processor shall process only on documented instructions and implement appropriate security measures",
      content: "Processor may determine the purposes and means of processing where it deems necessary for its legitimate business interests.",
      riskNote: "Clause grants processor controller-level discretion — violates Art.28 UK GDPR. Must be rewritten.",
      riskLevel: RiskLevel.CRITICAL,
    },
    {
      orderIndex: 3,
      title: "Sub-Processors",
      status: ClauseStatus.DEVIATION,
      templateClause: "Customer authorises listed sub-processors; 14 days notice for changes with right to object",
      content: "Processor may engage sub-processors at its discretion. Notice shall be provided within 30 days of engagement.",
      riskNote: "No prior authorisation or objection right — weakens controller's Art.28(2) rights",
      riskLevel: RiskLevel.HIGH,
    },
    {
      orderIndex: 4,
      title: "Security Measures",
      status: ClauseStatus.DEVIATION,
      templateClause: "TOMs including encryption at rest (AES-256), TLS 1.3 in transit, MFA, annual penetration testing",
      content: "Processor shall implement commercially reasonable security measures appropriate to the risk.",
      riskNote: "Vague standard — should specify encryption standards, access controls, and testing frequency",
      riskLevel: RiskLevel.MEDIUM,
    },
    {
      orderIndex: 5,
      title: "Breach Notification",
      status: ClauseStatus.DEVIATION,
      templateClause: "Notification without undue delay, within 48 hours of becoming aware",
      content: "Processor shall notify Controller of a Personal Data Breach within 14 calendar days of becoming aware.",
      riskNote: "14 days exceeds the UK GDPR 72-hour requirement — must be tightened to 48 hours",
      riskLevel: RiskLevel.HIGH,
    },
    {
      orderIndex: 6,
      title: "Deletion and Return",
      status: ClauseStatus.ACCEPTABLE,
      templateClause: "Delete or return all Personal Data within 30 days of termination, with written certification",
      content: "Processor shall delete all Personal Data within 60 days of termination and provide written certification.",
      riskNote: "60 days is longer than standard 30 days but commercially acceptable with certification",
      riskLevel: RiskLevel.LOW,
    },
    {
      orderIndex: 7,
      title: "Governing Law",
      status: ClauseStatus.STANDARD,
      templateClause: "Governed by the laws of England & Wales with exclusive jurisdiction",
      content: "This DPA is governed by the laws of England and Wales. Exclusive jurisdiction of England and Wales courts.",
      riskNote: "Matches approved KB clause",
      riskLevel: RiskLevel.LOW,
    },
  ];

  for (const c of acmeClauses) {
    await prisma.clause.create({
      data: {
        organisationId: org.id,
        documentId: acme.id,
        title: c.title,
        content: c.content,
        templateClause: c.templateClause,
        status: c.status,
        riskLevel: c.riskLevel,
        riskNote: c.riskNote,
        orderIndex: c.orderIndex,
        reviewStatus: ReviewStatus.PENDING,
      },
    });
  }

  for (const c of brightwaveClauses) {
    await prisma.clause.create({
      data: {
        organisationId: org.id,
        documentId: brightwave.id,
        title: c.title,
        content: c.content,
        templateClause: c.templateClause,
        status: c.status,
        riskLevel: c.riskLevel,
        riskNote: c.riskNote,
        orderIndex: c.orderIndex,
        reviewStatus: ReviewStatus.ACCEPTED,
      },
    });
  }

  for (const c of cloudCoreClauses) {
    await prisma.clause.create({
      data: {
        organisationId: org.id,
        documentId: cloudCore.id,
        title: c.title,
        content: c.content,
        templateClause: c.templateClause,
        status: c.status,
        riskLevel: c.riskLevel,
        riskNote: c.riskNote,
        orderIndex: c.orderIndex,
        reviewStatus: ReviewStatus.PENDING,
      },
    });
  }

  // --- Knowledge base clause corpus — approved boilerplate from PortSwigger's
  // standard contract library. These are the clauses that auto-matching checks
  // new contracts against. Organised by source document.

  const kbClauses: {
    title: string;
    content: string;
    category: string;
    sourceDocument: string;
    tags: string[];
  }[] = [
    // ===================================================================
    // Contract 1: Standard Mutual NDA (v3.0)
    // ===================================================================
    {
      title: "Confidential Information Definition",
      content:
        '"Confidential Information" means any information disclosed by one party (the "Disclosing Party") to the other (the "Receiving Party"), whether orally, in writing, or in any other tangible form, that is marked as confidential or that a reasonable person would understand to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information includes, without limitation, trade secrets, know-how, business plans, customer lists, financial information, software source code, security testing methodologies, and technical data.',
      category: "Confidentiality",
      sourceDocument: "Standard Mutual NDA v3.0",
      tags: ["nda", "definition", "confidentiality"],
    },
    {
      title: "Confidentiality Obligations",
      content:
        "The Receiving Party shall: (a) hold Confidential Information in strict confidence using no less than reasonable care; (b) not disclose Confidential Information to any third party without the Disclosing Party's prior written consent; (c) limit access to Confidential Information to those employees and contractors who have a need to know and are bound by confidentiality obligations no less protective than those herein; and (d) use Confidential Information solely for the Purpose.",
      category: "Confidentiality",
      sourceDocument: "Standard Mutual NDA v3.0",
      tags: ["nda", "obligations", "confidentiality"],
    },
    {
      title: "Exclusions from Confidential Information",
      content:
        "Confidential Information does not include information that: (a) is or becomes publicly available without breach of this Agreement; (b) was lawfully known to the Receiving Party before disclosure, as evidenced by written records; (c) is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information; or (d) is received from a third party who was not under an obligation of confidentiality.",
      category: "Confidentiality",
      sourceDocument: "Standard Mutual NDA v3.0",
      tags: ["nda", "exclusions", "confidentiality"],
    },
    {
      title: "NDA Term and Survival",
      content:
        "This Agreement shall remain in effect for a period of three (3) years from the Effective Date. The obligations of confidentiality shall survive termination of this Agreement and continue for a period of five (5) years from the date of disclosure of the relevant Confidential Information, or indefinitely with respect to trade secrets.",
      category: "Termination",
      sourceDocument: "Standard Mutual NDA v3.0",
      tags: ["nda", "term", "survival"],
    },
    {
      title: "No Licence",
      content:
        "Nothing in this Agreement grants the Receiving Party any right, title, or interest in or to the Disclosing Party's Confidential Information or any intellectual property rights. All Confidential Information remains the property of the Disclosing Party.",
      category: "IP Ownership",
      sourceDocument: "Standard Mutual NDA v3.0",
      tags: ["nda", "ip", "no-licence"],
    },
    {
      title: "Governing Law — England & Wales",
      content:
        "This Agreement and any dispute or claim arising out of or in connection with it shall be governed by and construed in accordance with the laws of England and Wales. The parties irrevocably submit to the exclusive jurisdiction of the courts of England and Wales.",
      category: "Governing Law",
      sourceDocument: "Standard Mutual NDA v3.0",
      tags: ["nda", "governing-law", "jurisdiction", "england-wales"],
    },
    {
      title: "Entire Agreement — NDA",
      content:
        "This Agreement constitutes the entire agreement between the parties with respect to its subject matter and supersedes all prior agreements, understandings, and representations, whether written or oral.",
      category: "Entire Agreement",
      sourceDocument: "Standard Mutual NDA v3.0",
      tags: ["nda", "entire-agreement", "boilerplate"],
    },

    // ===================================================================
    // Contract 2: SaaS Subscription Agreement (v2.1)
    // ===================================================================
    {
      title: "Licence Grant — SaaS",
      content:
        "Subject to Customer's compliance with this Agreement and payment of all applicable fees, Provider grants Customer a non-exclusive, non-transferable, non-sublicensable right to access and use the Service during the Subscription Term solely for Customer's internal business purposes.",
      category: "General",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "licence", "grant"],
    },
    {
      title: "Restrictions on Use — SaaS",
      content:
        "Customer shall not: (a) reverse engineer, decompile, or disassemble the Service; (b) use the Service to build a competitive product; (c) resell, sublicense, or distribute the Service to third parties; (d) use the Service for benchmarking or performance comparison without Provider's prior written consent; or (e) use the Service in violation of applicable law.",
      category: "General",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "restrictions", "acceptable-use"],
    },
    {
      title: "IP Ownership — SaaS",
      content:
        "All intellectual property rights in the Service, including any modifications, enhancements, and derivative works, remain with Provider. Customer retains all rights in Customer Data. No assignment of intellectual property is granted except the limited licence expressly set out in this Agreement.",
      category: "IP Ownership",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "ip", "ownership"],
    },
    {
      title: "Fees and Payment — SaaS",
      content:
        "Customer shall pay the fees set out in the Order Form annually in advance. Invoices are payable within thirty (30) days of receipt. Late payments bear interest at the rate of 4% per annum above the Bank of England base rate. Provider may suspend access to the Service if any undisputed invoice remains unpaid for more than fifteen (15) days after the due date.",
      category: "Payment Terms",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "fees", "payment"],
    },
    {
      title: "Limitation of Liability — SaaS",
      content:
        "Each party's aggregate liability arising out of or related to this Agreement shall not exceed two (2) times the total fees paid or payable by Customer in the twelve (12) months preceding the claim. Neither party limits liability for: (a) death or personal injury caused by negligence; (b) fraud or fraudulent misrepresentation; (c) breach of confidentiality obligations; (d) infringement of the other party's intellectual property rights; or (e) any liability that cannot be excluded by applicable law.",
      category: "Liability",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "liability", "cap", "carve-outs"],
    },
    {
      title: "Indemnity — SaaS",
      content:
        "Each party (the 'Indemnifying Party') shall indemnify the other (the 'Indemnified Party') against any third-party claims, damages, and reasonable legal costs arising from: (a) the Indemnifying Party's breach of confidentiality; (b) infringement of third-party intellectual property rights by the Indemnifying Party's technology (Provider) or Customer Data (Customer); and (c) the Indemnifying Party's breach of applicable data protection law.",
      category: "Indemnity",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "indemnity", "mutual"],
    },
    {
      title: "Termination — SaaS",
      content:
        "Either party may terminate this Agreement for convenience upon thirty (30) days' prior written notice. Either party may terminate immediately for material breach that remains uncured for fifteen (15) days after written notice. Upon termination, Customer's right to access the Service ceases, and Provider shall delete Customer Data within sixty (60) days, subject to any legal retention obligations.",
      category: "Termination",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "termination", "notice"],
    },
    {
      title: "Data Protection — SaaS",
      content:
        "Provider shall process Customer Personal Data solely on documented instructions from Customer and in accordance with applicable data protection law (including UK GDPR and the Data Protection Act 2018). Provider shall implement appropriate technical and organisational measures to protect such data. The parties shall enter into a Data Processing Agreement where required by law.",
      category: "Data Protection",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "data-protection", "gdpr"],
    },
    {
      title: "Confidentiality — SaaS",
      content:
        "Each party shall keep confidential all Confidential Information of the other party and use it only to perform its obligations under this Agreement. Obligations survive for three (3) years after termination, or indefinitely with respect to trade secrets.",
      category: "Confidentiality",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "confidentiality"],
    },
    {
      title: "Governing Law — SaaS",
      content:
        "This Agreement is governed by the laws of England & Wales and the parties submit to the exclusive jurisdiction of the courts of England & Wales.",
      category: "Governing Law",
      sourceDocument: "Standard SaaS Agreement v2.1",
      tags: ["saas", "governing-law", "england-wales"],
    },

    // ===================================================================
    // Contract 3: Professional Services Agreement (v1.2)
    // ===================================================================
    {
      title: "Services — PSA",
      content:
        "Provider shall perform the professional services described in each Statement of Work ('SOW') agreed between the parties. Each SOW shall specify the scope, deliverables, timeline, and fees. SOWs are incorporated into and governed by this Agreement.",
      category: "General",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "services", "sow"],
    },
    {
      title: "Fees and Payment — PSA",
      content:
        "Fees shall be calculated on a time-and-materials basis at the rates set out in the applicable SOW, or as a fixed price per deliverable. Invoices shall be submitted monthly in arrears and are payable within thirty (30) days of receipt. All fees are exclusive of VAT.",
      category: "Payment Terms",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "fees", "payment"],
    },
    {
      title: "Expenses — PSA",
      content:
        "Provider may incur reasonable travel and subsistence expenses in performance of the Services. Expenses exceeding £100 individually or £500 cumulatively per month require Customer's prior written approval. Receipts shall be provided with each invoice.",
      category: "Payment Terms",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "expenses", "reimbursement"],
    },
    {
      title: "IP Ownership — Work Product",
      content:
        "All intellectual property rights in deliverables created specifically for Customer under an SOW ('Work Product') shall vest in Customer upon full payment of all fees due for that SOW. Provider retains ownership of its pre-existing tools, methodologies, and know-how ('Provider Background IP'). Provider grants Customer a perpetual, irrevocable, royalty-free licence to use Provider Background IP to the extent embedded in the Work Product.",
      category: "IP Ownership",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "ip", "work-product", "assignment"],
    },
    {
      title: "Limitation of Liability — PSA",
      content:
        "Provider's aggregate liability for services under this Agreement shall not exceed one (1) times the total fees paid for the specific SOW giving rise to the claim. The standard uncapped carve-outs (death, fraud, confidentiality, IP, data protection) apply.",
      category: "Liability",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "liability", "cap"],
    },
    {
      title: "Insurance — PSA",
      content:
        "Provider shall maintain: (a) Professional Indemnity insurance with a limit of not less than £2,000,000 per claim; (b) Public Liability insurance with a limit of not less than £5,000,000 per occurrence; and (c) Employer's Liability insurance as required by law. Certificates of insurance shall be provided upon request.",
      category: "Insurance",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "insurance", "pi", "pl"],
    },
    {
      title: "Termination — PSA",
      content:
        "Either party may terminate this Agreement or any individual SOW for convenience upon thirty (30) days' written notice. Either party may terminate immediately for material breach that remains uncured for fifteen (15) days.",
      category: "Termination",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "termination"],
    },
    {
      title: "Non-Solicitation — Mutual",
      content:
        "During the term of this Agreement and for twelve (12) months after its termination, neither party shall, without the other's prior written consent, solicit or induce to leave the employment of the other party any employee who was materially involved in the provision or receipt of the Services.",
      category: "General",
      sourceDocument: "Standard Professional Services Agreement v1.2",
      tags: ["psa", "non-solicitation", "staff"],
    },

    // ===================================================================
    // Contract 4: Data Processing Agreement (v1.0)
    // ===================================================================
    {
      title: "Subject Matter and Duration — DPA",
      content:
        "This DPA governs the processing of Personal Data by Provider on behalf of Customer in connection with the provision of the Services under the Main Agreement. The duration of processing shall be for the term of the Main Agreement plus any post-termination retention period required by law.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "scope", "duration"],
    },
    {
      title: "Nature and Purpose — DPA",
      content:
        "The nature and purpose of processing includes hosting, storing, and transmitting Customer Personal Data as necessary to provide, maintain, and support the Services, and to comply with Customer's documented instructions.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "purpose", "processing"],
    },
    {
      title: "Types of Personal Data — DPA",
      content:
        "The Personal Data processed may include: name, email address, job title, telephone number, IP address, login credentials, usage logs, and any other Personal Data Customer chooses to upload to or process through the Service.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "data-types", "personal-data"],
    },
    {
      title: "Data Subject Categories — DPA",
      content:
        "Data subjects include Customer's employees, contractors, authorised users, and end users of the Service. Data subjects do not include Provider's own employees or contractors.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "data-subjects"],
    },
    {
      title: "Processor Obligations — DPA",
      content:
        "Provider shall: (a) process Personal Data only on documented instructions from Customer; (b) ensure persons authorised to process have committed to confidentiality; (c) implement appropriate technical and organisational measures as set out in Annex A; (d) assist Customer in responding to data subject requests; (e) assist Customer in meeting its obligations under Articles 32–36 UK GDPR; and (f) notify Customer without undue delay on becoming aware of a Personal Data Breach.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "processor-obligations", "art28"],
    },
    {
      title: "Sub-Processors — DPA",
      content:
        "Customer authorises Provider to engage the sub-processors listed in Annex B. Provider shall notify Customer of any intended changes to sub-processors at least fourteen (14) days in advance. Customer may object on reasonable data protection grounds. Provider shall impose data protection obligations on sub-processors no less protective than those in this DPA.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "sub-processors", "consent"],
    },
    {
      title: "Security Measures — DPA",
      content:
        "Provider shall implement and maintain technical and organisational measures appropriate to the risk, including: encryption of Personal Data at rest (AES-256) and in transit (TLS 1.3); access controls with multi-factor authentication; regular penetration testing and vulnerability scanning; ISO 27001 certified information security management system; and business continuity and disaster recovery plans tested annually.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "security", "toms", "iso27001"],
    },
    {
      title: "Breach Notification — DPA",
      content:
        "Provider shall notify Customer of a Personal Data Breach without undue delay and in any event within forty-eight (48) hours of becoming aware. The notification shall describe the nature of the breach, the categories and approximate number of data subjects and records affected, the likely consequences, and the measures taken or proposed to address the breach.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "breach", "notification"],
    },
    {
      title: "Deletion and Return — DPA",
      content:
        "Upon termination of the Main Agreement, Provider shall, at Customer's election, delete or return all Personal Data within thirty (30) days, and certify such deletion in writing. Provider may retain copies to the extent required by applicable law, subject to continuing confidentiality and security obligations.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "deletion", "return"],
    },
    {
      title: "Audit Rights — DPA",
      content:
        "Customer may, no more than once per calendar year and upon thirty (30) days' written notice, audit Provider's compliance with this DPA. Audits shall be during normal business hours, shall not unreasonably disrupt Provider's operations, and shall be at Customer's expense. In lieu of an on-site audit, Provider may provide a current SOC 2 Type II or ISO 27001 certificate.",
      category: "Data Protection",
      sourceDocument: "Standard Data Processing Agreement v1.0",
      tags: ["dpa", "audit", "compliance"],
    },

    // ===================================================================
    // Contract 5: Customer Order Form (v2.0)
    // ===================================================================
    {
      title: "Products and Services — Order Form",
      content:
        "Customer orders the products and services (the 'Products') as described in the attached Schedule. Provider shall make the Products available to Customer in accordance with the Standard SaaS Agreement, which is incorporated into this Order Form by reference.",
      category: "General",
      sourceDocument: "Standard Customer Order Form v2.0",
      tags: ["order-form", "products", "incorporation"],
    },
    {
      title: "Fees — Order Form",
      content:
        "The fees for the Products are set out in the attached Schedule. All fees are exclusive of VAT and any applicable sales taxes. Fees are fixed for the Initial Term and may be increased by Provider upon not less than sixty (60) days' written notice prior to any renewal.",
      category: "Payment Terms",
      sourceDocument: "Standard Customer Order Form v2.0",
      tags: ["order-form", "fees", "renewal"],
    },
    {
      title: "Payment Terms — Order Form",
      content:
        "Invoices are payable within thirty (30) days of the invoice date. Late payments bear interest at 4% per annum above the Bank of England base rate. Provider may suspend access if payment is not received within fifteen (15) days of a written reminder.",
      category: "Payment Terms",
      sourceDocument: "Standard Customer Order Form v2.0",
      tags: ["order-form", "payment", "net30"],
    },
    {
      title: "Term — Order Form",
      content:
        "The Initial Term for each Product is as specified in the Schedule. Following the Initial Term, the Order Form shall auto-renew for successive twelve (12) month periods unless either party gives not less than ninety (90) days' written notice of non-renewal before the end of the current term.",
      category: "Termination",
      sourceDocument: "Standard Customer Order Form v2.0",
      tags: ["order-form", "term", "auto-renewal"],
    },

    // ===================================================================
    // Contract 6: Reseller / Channel Partner Agreement (v1.1)
    // ===================================================================
    {
      title: "Appointment — Reseller",
      content:
        "Provider appoints Reseller as a non-exclusive authorised reseller of the Products in the Territory (United Kingdom). Reseller shall use reasonable endeavours to promote, market, and sell the Products to end users. Reseller has no authority to bind Provider to any contract or make representations on Provider's behalf.",
      category: "General",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "appointment", "non-exclusive"],
    },
    {
      title: "Reseller Obligations",
      content:
        "Reseller shall: (a) promote and market the Products in accordance with Provider's brand guidelines and any co-marketing plan; (b) provide first-line technical support to end users; (c) maintain accurate sales records and report monthly; (d) not make any representations or warranties beyond those in Provider's standard EULA; and (e) comply with all applicable laws including anti-bribery and export controls.",
      category: "General",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "obligations", "compliance"],
    },
    {
      title: "IP and Branding — Reseller",
      content:
        "Provider owns all intellectual property rights in the Products and associated materials. Provider grants Reseller a limited, non-exclusive, non-transferable licence to use Provider's trademarks and logos solely for marketing the Products in the Territory, in accordance with Provider's brand guidelines. Reseller shall not register or use any confusingly similar marks or domain names.",
      category: "IP Ownership",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "ip", "trademark", "branding"],
    },
    {
      title: "Fees and Commission — Reseller",
      content:
        "Reseller shall pay Provider the wholesale price for each Product as set out in the current Price List. Reseller shall invoice end users directly at its own pricing. Provider shall pay Reseller a commission of 25% of net licence revenue collected from leads sourced exclusively by Reseller in accordance with the lead registration process. Commissions are paid quarterly within forty-five (45) days of quarter-end.",
      category: "Payment Terms",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "commission", "pricing"],
    },
    {
      title: "Limitation of Liability — Reseller",
      content:
        "Each party's aggregate liability shall not exceed one (1) times the total commission paid to Reseller in the twelve (12) months preceding the claim. The standard uncapped carve-outs apply.",
      category: "Liability",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "liability", "cap"],
    },
    {
      title: "Term and Termination — Reseller",
      content:
        "Initial term of twelve (12) months, auto-renewing for successive twelve (12) month periods unless terminated by either party upon not less than ninety (90) days' written notice before the end of the current term. Either party may terminate immediately for material breach or insolvency.",
      category: "Termination",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "term", "termination"],
    },
    {
      title: "Confidentiality — Reseller",
      content:
        "Standard mutual confidentiality obligations. Obligations survive for three (3) years after termination. Customer lists and pricing information are Confidential Information of Provider.",
      category: "Confidentiality",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "confidentiality"],
    },
    {
      title: "Governing Law — Reseller",
      content:
        "This Agreement is governed by the laws of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales.",
      category: "Governing Law",
      sourceDocument: "Standard Reseller Agreement v1.1",
      tags: ["reseller", "governing-law", "england-wales"],
    },
  ];

  // Upsert each KB clause — idempotent by (organisationId + title + sourceDocument)
  let kbInserted = 0;
  let kbSkipped = 0;
  for (const k of kbClauses) {
    const existing = await prisma.knowledgeBaseClause.findFirst({
      where: {
        organisationId: org.id,
        title: k.title,
        sourceDocument: k.sourceDocument,
      },
      select: { id: true },
    });
    if (existing) {
      // Update tags if they changed
      await prisma.knowledgeBaseClause.update({
        where: { id: existing.id },
        data: { content: k.content, category: k.category, tags: k.tags, isActive: true },
      });
      kbSkipped++;
    } else {
      await prisma.knowledgeBaseClause.create({
        data: {
          organisationId: org.id,
          moduleId: legalModule.id,
          title: k.title,
          content: k.content,
          category: k.category,
          sourceDocument: k.sourceDocument,
          tags: k.tags,
          isActive: true,
        },
      });
      kbInserted++;
    }
  }
  const knowledgeEntries = [
    {
      title: "Liability cap deviations — standard response",
      summary:
        "Liability caps materially above 2x annual fees should be challenged. Propose realignment to 2x trailing 12-month fees with customary uncapped carve-outs (confidentiality breach, IP infringement, wilful misconduct). Escalate to a partner where the counterparty refuses.",
      tags: ["liability", "negotiation", "saas"],
    },
    {
      title: "IP assignment clauses — standard response",
      summary:
        "Broad IP assignment clauses that cover all work product should be countered with a carve-out for pre-existing IP and independently developed tools. Escalate if client insists on assignment of background IP.",
      tags: ["ip", "assignment", "negotiation"],
    },
    {
      title: "Missing governing law — action required",
      summary:
        "Contracts missing a governing law clause are legally ambiguous and must not be signed. Insert standard clause: governed by laws of England and Wales, courts of England and Wales have exclusive jurisdiction.",
      tags: ["governing-law", "jurisdiction", "critical"],
    },
    {
      title: "Unlimited liability clauses — automatic rejection",
      summary:
        "Any clause proposing unlimited liability for either party is non-standard and must be rejected. Standard position: aggregate liability capped at 2x annual fees. Unlimited liability only acceptable for the standard uncapped carve-outs (death, fraud, confidentiality breach, IP infringement, data protection violations).",
      tags: ["liability", "unlimited", "rejection"],
    },
    {
      title: "Data processing — GDPR compliance baseline",
      summary:
        "All data processing clauses must comply with UK GDPR Art.28 requirements: processing only on documented instructions, appropriate technical and organisational measures, assistance with data subject requests and breach notifications, and deletion/return of data on termination. Sub-processor consent requires 14 days' notice with right to object.",
      tags: ["data-protection", "gdpr", "compliance"],
    },
    {
      title: "Software licence scope — permitted use boundaries",
      summary:
        "Licence grants must be explicitly scoped to the customer's internal business purposes only. No right to sublicense, resell, or use for benchmarking. Any clause granting broader rights (e.g. 'for any purpose', 'worldwide, perpetual') must be rejected and re-scoped to internal use during the subscription term.",
      tags: ["licensing", "saas", "scope"],
    },
    {
      title: "Security assessment / pentesting engagement terms",
      summary:
        "For penetration testing engagements (a core PortSwigger service), ensure the SOW specifies: authorised IP ranges, testing methodology (OWASP, PTES), excluded systems, data handling procedures for any customer data accessed during testing, and a limitation of liability that reflects the nature of security testing. Never accept clauses that require the provider to guarantee that no vulnerabilities will be found.",
      tags: ["pentesting", "security", "sow"],
    },
    {
      title: "Confidentiality duration — minimum 3 years",
      summary:
        "Standard confidentiality obligations survive for three (3) years after termination, or indefinitely for trade secrets. Clauses proposing shorter survival periods (e.g. 1-2 years) should be rejected. Perpetual confidentiality applies to: source code, security testing methodologies, customer lists, and pricing information.",
      tags: ["confidentiality", "duration", "survival"],
    },
    {
      title: "Indemnity — mutual IP and data protection",
      summary:
        "Standard position is mutual indemnity covering: (a) third-party IP infringement claims arising from the provider's technology or customer's data; (b) breach of confidentiality; and (c) breach of data protection law. Reject one-sided indemnity clauses that place all risk on one party.",
      tags: ["indemnity", "mutual", "ip"],
    },
    {
      title: "Auto-renewal clauses — minimum 90 days notice",
      summary:
        "Auto-renewal clauses are commercially acceptable provided: (a) the renewal period is no longer than 12 months; (b) either party may opt out with not less than ninety (90) days' written notice before the end of the current term; and (c) the provider may increase fees on renewal with at least sixty (60) days' notice. Perpetual auto-renewal without opt-out is not acceptable.",
      tags: ["renewal", "term", "notice"],
    },
    {
      title: "Source code escrow — SaaS agreements",
      summary:
        "Source code escrow clauses are commercially sensitive. Standard position: escrow is only offered to Enterprise-tier customers at additional cost. The escrow agreement must be a separate tripartite agreement with an established escrow agent (e.g. NCC Group). Release conditions limited to: (a) insolvency of the provider; (b) material and unremedied breach of support obligations lasting 30+ days.",
      tags: ["escrow", "saas", "enterprise"],
    },
    {
      title: "Non-solicitation — mutual 12 months",
      summary:
        "Standard position is a mutual non-solicitation clause covering employees materially involved in the services for twelve (12) months post-termination. Non-solicitation must not extend to general recruitment advertising not targeted at the other party's staff. Non-compete clauses are not standard and should be rejected.",
      tags: ["non-solicitation", "staff", "mutual"],
    },
    {
      title: "Export control and sanctions compliance",
      summary:
        "Software products (including Burp Suite) may be subject to UK export controls and sanctions. Standard clause: Customer represents it is not located in a sanctioned jurisdiction and will not use the products in violation of applicable export control or sanctions laws. Provider may suspend access immediately if Customer becomes a sanctioned party.",
      tags: ["export-control", "sanctions", "compliance"],
    },
    {
      title: "Open source software usage — acceptable policy",
      summary:
        "PortSwigger products may incorporate open source components under permissive licences (MIT, Apache 2.0, BSD). Copyleft licences (GPL, AGPL) are not used in proprietary products. Customer clauses requiring a full open source audit or warranty that no open source code is used are not standard and should be rejected in favour of a reference to the publicly available open source attribution page.",
      tags: ["open-source", "licensing", "audit"],
    },
    {
      title: "Service level agreements — uptime and credits",
      summary:
        "Standard SLA: 99.5% uptime for cloud-hosted products, measured monthly excluding scheduled maintenance (published 48 hours in advance). Service credits: 5% of monthly fees for each full 1% below SLA, capped at 50% of monthly fees. SLA credits are the sole and exclusive remedy for failure to meet the SLA. Custom SLAs above 99.9% are Enterprise-tier only.",
      tags: ["sla", "uptime", "service-credits"],
    },
    {
      title: "Termination for convenience — notice periods",
      summary:
        "Either party may terminate for convenience on thirty (30) days' written notice. For Enterprise agreements with committed annual spend, the initial term is fixed (no convenience termination during the initial term). Termination for material breach: fifteen (15) days to cure after written notice.",
      tags: ["termination", "notice", "breach"],
    },
    {
      title: "Force majeure — standard exclusions",
      summary:
        "Force majeure clauses are standard but must not excuse the customer's obligation to pay fees for services already rendered. Events covered: acts of God, war, terrorism, civil unrest, government action, internet backbone failures, and pandemics. Labour disputes and subcontractor defaults are not force majeure events for the provider.",
      tags: ["force-majeure", "boilerplate", "exclusions"],
    },
    {
      title: "Publicity and case study rights",
      summary:
        "Standard position: Provider may use Customer's name and logo on its website and marketing materials as a customer reference. Case studies and press releases require Customer's prior written approval (not to be unreasonably withheld). Customers may opt out of all publicity by written notice, which takes effect within thirty (30) days.",
      tags: ["publicity", "marketing", "reference"],
    },
    {
      title: "API usage and rate limiting",
      summary:
        "API access is subject to fair use rate limits published in the documentation. Excessive API usage that degrades service for other customers may result in throttling or suspension. Customer may purchase additional API capacity at published rates. Scraping, reverse engineering the API, or bypassing rate limits is prohibited.",
      tags: ["api", "rate-limiting", "acceptable-use"],
    },
  ];

  for (const k of knowledgeEntries) {
    const existing = await prisma.knowledgeEntry.findFirst({
      where: { organisationId: org.id, title: k.title },
      select: { id: true },
    });
    if (!existing) {
      await prisma.knowledgeEntry.create({
        data: { organisationId: org.id, moduleId: legalModule.id, title: k.title, summary: k.summary, tags: k.tags, isActive: true },
      });
    }
  }

  console.log("Seed complete:");
  console.log(`  Organisation: ${org.name} (${org.slug})`);
  console.log(`  Module:       Legal [ACTIVE]`);
  console.log(`  People:       Sarah Okafor, James Whitfield, Priya Nair`);
  console.log(`  Template:     Standard SaaS Agreement v2.1`);
  console.log(`  Documents:    3 (Acme HIGH / Brightwave LOW / CloudCore MEDIUM)`);
  console.log(`  Clauses:      ${acmeClauses.length} on Acme, ${brightwaveClauses.length} on Brightwave, ${cloudCoreClauses.length} on CloudCore`);
  console.log(`  Knowledge:    ${knowledgeEntries.length} entries`);
  console.log(`  KB Clauses:   ${kbInserted} inserted, ${kbSkipped} skipped (${kbClauses.length} total)`);
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
