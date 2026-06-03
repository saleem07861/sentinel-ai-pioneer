# Sentinel AI

AI-powered contract review platform. Upload contracts, let AI extract and classify every clause against standard templates, then review, edit, and approve each deviation through a mandatory human-decision workflow. Built for legal teams who need AI speed with human accountability.

**[📺 Watch the demo]()** — 90-second walkthrough of the full upload → review → approve flow.

## What It Does

1. **Upload** a contract (PDF, DOCX, or TXT) and select a comparison template
2. **AI extracts & classifies** every clause — matching against approved standard clauses and flagging deviations
3. **Review side-by-side** — accept, edit, or flag each clause that needs attention
4. **Record a final decision** — approve, reject, negotiate, or escalate
5. **Knowledge base grows** — save accepted clauses for future auto-matching

Every action is logged in an immutable audit trail. Three user roles (Admin, Team Leader, Associate) with page-level access control.

## Quick Start

### Docker (recommended)

```bash
docker compose up
```

Opens `http://localhost:3000`. Database auto-created, seeded, and ready. No API key needed — Mock AI runs offline.

### Manual

**Prerequisites:** Node.js 22+, PostgreSQL 16+

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:seed
npm run dev
```

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sentinel.ai` | `admin123` |
| Team Leader | `sarah@meridian.legal` | `admin123` |
| Associate | `james@meridian.legal` | `admin123` |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL + Prisma 7 |
| Auth | NextAuth v5 (credentials + JWT) |
| Styling | Tailwind CSS 3 with design tokens |
| AI | Provider-agnostic (DeepSeek, OpenAI, Mock fallback) |
| Testing | Playwright (46 E2E tests, 12 groups) |
| CI/CD | GitHub Actions |

## Project Structure

```
├── agents/          # AI provider abstraction (server-side only)
├── services/        # Business logic — transactions + audit pairing
├── app/             # Next.js pages + 20 API endpoints
├── components/      # React Server & Client Components
├── prisma/          # Schema, migrations, seed data
├── lib/             # Shared utilities (auth, Prisma, HTTP)
├── tests/e2e/       # Playwright test suites
├── test-contracts/  # 5 standard templates + 5 variant contracts
└── uploads/         # Uploaded documents (git-ignored)
```

## Architecture Decisions

**Provider-agnostic AI layer.** `agents/` implements an `AIClient` interface with swappable backends (DeepSeek, OpenAI, Ollama, Mock). Selection is hierarchical — org setting → env var → Mock fallback. This means the system works offline with zero configuration and upgrades to real AI with a single API key.

**AI proposes, humans decide.** Every AI analysis is an immutable append-only record. The system never acts on AI output — a `HumanDecision` must be explicitly created before any document moves to the final state. The AI is a junior reviewer surfacing findings; the lawyer is the decision-maker.

**Immutable audit trail.** `AuditLog` rows are written atomically alongside every state change via Prisma `$transaction`. Every document status transition, AI analysis, and human decision is in one table, queryable by entity, actor, and action. This is the compliance backbone.

**Poor man's RAG over vector DB.** For clause matching, the system fetches all approved clauses in the same category and asks the AI to judge similarity. This trades the fixed cost of embedding infrastructure for the variable cost of AI calls — the right tradeoff when the corpus is measured in hundreds of clauses rather than millions. A vector store (`pgvector`) is the next step when the knowledge base crosses a few thousand clauses.

**Mock AI for zero-config development.** The Mock provider uses deterministic keyword matching, making the system fully functional without API keys. It also serves as a baseline for eval — comparing real provider output against the mock measures whether the AI is adding value over simple heuristics.

**Design token system.** All styling uses a 9-token semantic system (`surface`, `surface-raised`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`, `accent`, `danger`) defined as CSS variables and mapped to Tailwind. No raw hex values in components — grep for `#` or `rgb(` to verify.

## Testing

```bash
npm run dev                    # Start dev server first
npm run test:browser           # Run Playwright E2E tests
npm run test:browser:report    # View HTML report
```

46 tests across 12 groups covering upload, clause extraction, review workflow, decision recording, role-based access, knowledge base matching, and self-match detection. Test contracts with known deviations are in `test-contracts/variants/`.

## Real AI vs Mock

By default the Mock AI provider runs offline using keyword matching. To use real AI, add a provider key:

```env
DEEPSEEK_API_KEY=sk-...
```

Or configure OpenAI or a local model via Settings → AI Provider in the admin panel.

## What's Next

What I'd build with more time — listed in priority order:

- **DB-backed auth with hashed passwords.** Current demo users are hardcoded for easy evaluation. Production would use NextAuth with a database adapter and bcrypt.
- **Real-time notifications.** WebSocket or SSE for "new document needs review" and "decision recorded" events.
- **Pagination & virtual scrolling.** Document and audit lists currently load all records. Needed before the dataset grows beyond demo size.
- **Unit test suite.** Current coverage is E2E only. Adding Vitest unit tests for `services/` and `agents/` would catch regressions earlier in the pipeline.
- **OpenAPI spec.** 20 endpoints would benefit from a generated Swagger document for team onboarding.
- **Vector store migration.** Move clause matching from AI similarity calls to `pgvector` embeddings when the knowledge base exceeds ~1,000 clauses.

## License

MIT
