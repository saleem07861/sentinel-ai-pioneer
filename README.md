# Sentinel AI — AI-Powered Contract Review

**Built for the PortSwigger AI Pioneer application.**

> *"Our small in-house legal team gets a steady stream of fairly standard commercial contracts. Every single one still gets read by a person, and the queue is longer than the day. Show us how AI could help."*

This is my answer — not a proposal, not a deck, but a working, deployed application.

---

## What It Does

Sentinel AI takes a contract (PDF, DOCX, or TXT), extracts every clause, compares each one against your organisation's approved standard templates, and flags **only the deviations** for human review. The lawyer focuses on what changed — not on re-reading boilerplate.

### The Core Insight

**A lawyer's value is not in confirming the Governing Law clause is unchanged. It's in spotting the one sentence someone changed in the liability section.**

Sentinel AI automates the first task so the lawyer can focus on the second.

---

## Live Demo

```
https://sentinel.eportfolios.co.uk
```

| Role | Email | Password | What They See |
|------|-------|----------|---------------|
| **Admin** | `admin@sentinel.ai` | `admin123` | Everything — including Settings, Audit, Team Management |
| **Team Leader** | `sarah@meridian.legal` | `admin123` | Everything except Settings |
| **Associate** | `james@meridian.legal` | `admin123` | Dashboard, Documents, Clauses, Decisions, Knowledge |

**5 showcase documents are pre-seeded** — each based on a standard template with 2-4 subtle changes (day counts, amounts, jurisdictions, added text). Login, open any document, and see the system flag exactly what changed.

[Full Implementation Walkthrough →](https://sentinel.eportfolios.co.uk/walkthrough)

---

## Design Philosophy

**Diagnose first. AI is a suggester, not a decider.**

Every decision in this system flows from two rules:

1. **AI proposes, humans dispose.** The system never acts on AI output without a `HumanDecision` record. The AI extracts and classifies clauses — but a person must review, accept, edit, or flag each one before any document can be approved.

2. **The simplest tool that works.** Metadata (parties, dates, contract type) is extracted with regex — fast, deterministic, no AI needed. Template matching uses keyword similarity scoring, not LLM calls. AI is reserved for the one task that actually requires it: understanding and classifying legal clauses.

---

## Architecture

```
Browser (Next.js 14 App Router)
    │
    ├── Server Components (auth, data fetching)
    └── Client Components (interactive review UI)
            │
    ── REST API (20+ endpoints) ──
            │
    ── Services Layer (pure business logic, no AI, no HTTP) ──
            │
    ── AI Agents (server-side only, never imported in client) ──
            │
    ── PostgreSQL (Neon, Prisma 7) ──
```

### Key Architectural Decisions

| Decision | Reasoning |
|---|---|
| **Services never call AI. AI never touches HTTP.** | Swap providers without touching business logic. Test deterministically. |
| **Multi-model from day one.** | DeepSeek / OpenAI / Local / Mock — switchable per-organisation via UI. |
| **Deterministic fallback for all AI calls.** | The entire system works without any API key. Mock provider returns test data. |
| **Local AI path for sensitive data.** | `LOCAL` provider + `localAiUrl` field. Architecture anticipates self-hosted models for organisations that cannot send contracts to cloud AI. |
| **Human-approval invariant.** | `HumanDecision` is append-only. Every state change from a decision is recorded as a separate audit entry. |
| **Audit trail on every mutation.** | 10 models. `AuditLog` records `entityType`, `entityId`, `action`, `oldValue`, `newValue`, `actorId` — all in the same Prisma transaction as the state change. |

---

## What It Detects

The 5 pre-seeded showcase documents demonstrate these detection capabilities:

| Change Type | Example | Risk |
|---|---|---|
| **Day count change** | Termination notice: 30 → 90 days | MEDIUM |
| **Monetary change** | Liability cap: 2x fees → 1x fees | HIGH |
| **Jurisdiction change** | England & Wales → Scotland | HIGH |
| **Insurance change** | PI cover: £2M → £1M | HIGH 🚩 |
| **Text addition** | Added adviser disclosure clause | MEDIUM |
| **Breach window** | Breach notification: 48h → 72h | HIGH 🚩 |
| **Data retention** | Deletion period: 30 → 60 days | MEDIUM |
| **IP exclusion** | Methodologies: owned → licensed | MEDIUM |
| **Non-renewal shortened** | 90 days → 30 days (customer disadvantage) | HIGH |

Each document has a mix of STANDARD (unchanged) and DEVIATION (changed) clauses. STANDARD clauses are hidden from review — the user only sees what needs attention.

---

## Workflow

```
UPLOAD → EXTRACT → MATCH → REVIEW → DECIDE → APPROVE
```

1. **Upload** — Select a file + template. Metadata extracted via regex (parties, type, date).
2. **Extract** — AI extracts clauses. Each clause is matched against templates (keyword similarity) and Knowledge Base (≥85% confidence → auto-STANDARD).
3. **Review** — Only non-STANDARD clauses are shown. Per-clause Accept / Edit / Flag controls. Side-by-side comparison panels. Progress bar. Risk score drops as clauses are reviewed.
4. **Decide** — When all clauses reviewed, decision form appears. Decision maker auto-set from session. Five outcomes: Accept, Reject, Negotiate, Escalate, Defer.
5. **Approve** — New version created (v2). approvedContent assembled. Download button appears. Version chain: ← v1 / v2 → navigation.

---

## Role-Based Access

| Role | Can Access | Design Intent |
|------|-----------|---------------|
| **admin** | Everything + Settings + Team Management | System owner who configures AI providers and API keys |
| **teamLeader** | Everything except Settings | Senior lawyer who manages the team and views the audit trail |
| **associate** | Dashboard, Documents, Clauses, Decisions, Knowledge, Help | Junior reviewer doing day-to-day clause review |

Role enforced at three levels: **auth** (JWT token), **nav** (filtered sidebar), **page** (redirect if unauthorised). API-level 403 enforcement is acknowledged technical debt.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict mode — no `any`) |
| Styling | Tailwind CSS 3 with CSS variable design tokens |
| Auth | NextAuth v5 (Credentials + JWT) |
| Database | Prisma 7 + PostgreSQL (Neon serverless) |
| AI | DeepSeek V4 / OpenAI / Local / Mock (deterministic fallback) |
| Testing | Playwright (46 tests, 12 groups) |
| Deployment | PM2 + Apache reverse proxy on IONOS VPS |
| SSL | Let's Encrypt via Certbot |

---

## Honest Assessment

### What's Strong
- **Working, deployed, authenticated application** with a custom domain
- **The data model** is multi-tenant and anticipates future modules (Legal → Sales → Finance → HR)
- **The role system** mirrors real legal team structures
- **AI is a tool, not a decision-maker** — human-in-the-loop is a design invariant
- **The system works without any AI key** (Mock fallback) — fully demoable
- **The audit trail is complete** — every state change is recorded
- **The walkthrough is thorough** — every screen, API, and decision explained

### What's Not Done
- **API-level permission enforcement** — pages are guarded, API endpoints are not (acknowledged)
- **Password hashing** — demo users use plaintext (requires bcrypt for production)
- **Real user testing** — system is functional but has not been tested with legal professionals
- **Upload UI** — file input is hidden, needs a visual drag-and-drop zone
- **Neon free tier** — DB scales to zero after idle; first request may 500

---

## What I Learned

**Don't auto-approve.** Early versions auto-approved documents when all clauses were accepted. Watching the workflow revealed this was wrong — the user needs an explicit decision moment. The decision form is now hidden until all clauses are reviewed, then appears with the user's name auto-filled.

**The problem is workflow, not AI.** The AI clause extraction was the easy part. The hard part was designing a review interface that makes a non-technical lawyer feel in control — progress bars, hidden STANDARD clauses, side-by-side comparison without word-level diff noise.

**Plesk terminals wrap long commands.** The VPS deployment scripts (`update.sh`, `dbupdate.sh`) exist because the Plesk SSH terminal has a fixed narrow width. A `&&` chain breaks. A short script name doesn't.

**Template matching by position is fragile.** Clause #4 in one contract might be clause #7 in another. Switched to keyword title similarity scoring — exact word match = 1.0, substring = 0.6, position is a last-resort fallback.

---

## What Came Next

After building Sentinel AI, I realised the deeper challenge was diagnosing the right solution level for any operational workflow — not just legal documents. That led to:

**[SolutionPath AI →](https://solutions.eportfolios.co.uk)** — A diagnostic system that analyses a business process, identifies bottlenecks, and recommends the most appropriate solution from 11 levels (checklist → process fix → Python script → automation → RAG → agentic workflow → enterprise AI). 50 solution patterns, 127 tools, multi-model AI backend.

Both projects share the same thesis: **diagnose first, build the simplest solution that works.**

---

## Running Locally

```bash
git clone https://github.com/saleem07861/sentinel-ai.git
cd sentinel-ai
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npx tsx prisma/seed-showcase.ts  # 5 demo documents with subtle changes
npm run dev
```

Open `http://localhost:3000` — log in as `admin@sentinel.ai` / `admin123`.

---

*Built June 2026. Not a finished product — a working demonstration of how AI can help a legal team focus on what matters.*
