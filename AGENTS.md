# Repository Guidelines

## Language

All communication, code comments, documentation, commit messages, and any other output must be in **English**. Never switch to other languages unless explicitly requested by the user.

---

## Project Structure & Module Organization

```
sentinel-ai/
├── agents/            # AI client abstraction (server-side only)
├── services/          # Business logic — no AI calls, no HTTP
├── app/               # Next.js 14 App Router (pages + API routes)
│   ├── api/           # REST endpoints (analysis, documents, clauses, decisions,
│   │                  #   knowledge-base [clauses, templates, match, upload, categories],
│   │                  #   risk [documents, summary], people, dashboard, settings, auth)
│   ├── documents/     # Upload, list, detail views
│   ├── clauses/       # Flagged-clause attention list
│   ├── decisions/     # Human-approval queue
│   ├── knowledge/     # Captured organisational knowledge
│   ├── audit/         # Full audit trail browser
│   ├── people/        # Team member management (role-based)
│   ├── settings/      # AI provider & org API key configuration
│   ├── help/          # Onboarding guide & FAQ
│   └── login/         # NextAuth v5 authentication page
├── components/        # React Server & Client Components
├── prisma/            # Schema, migrations, seed.ts (clean) + seed-full.ts (demo data), clear-contracts.ts
├── lib/               # Shared utilities (Prisma singleton, auth, HTTP helpers)
├── types/             # TypeScript type augmentations (next-auth.d.ts)
├── tests/             # Playwright E2E tests
│   └── e2e/           # feature-verification.spec.ts, full-suite.spec.ts
├── test-contracts/    # 5 sample templates + variants/ (15 files: v2, v3, & deviated variants)
├── uploads/           # Uploaded files (git-ignored except .gitkeep)
├── auth.ts            # NextAuth v5 configuration (root-level)
├── middleware.ts       # Disabled — auth handled via RootLayout session check
├── prisma.config.ts   # Prisma 7 runtime adapter config
└── Dockerfile         # Container build for non-Plesk deploys
```

**Key rule:** `agents/` must never be imported into client components — AI calls are server-side only. All state mutations go through `services/`, which own Prisma transactions and audit-log pairing.

---

## Build, Test, and Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (hot-reload on `localhost:3000`) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client from schema |
| `npm run db:seed` | Seed the database with demo data (`prisma/seed.ts`) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run test:browser` | Run Playwright E2E tests against a running dev server |
| `npm run test:browser:prod` | Seed DB then run Playwright E2E tests |
| `npm run test:browser:report` | Open HTML test report (`tests/e2e/report`) |

**Helper scripts** (root-level):

| Script | What it does |
|---|---|
| `bash test.sh` | Seeds → starts dev → runs Playwright tests → stops server (one-shot, local) |
| `bash update.sh` | Pulls → copies env → builds → restarts PM2 (code-only VPS deploy) |
| `bash dbupdate.sh` | Pulls → installs → prisma generate → prisma db push → seeds → builds → restarts PM2 (schema/package VPS deploy) |
| `bash clear.sh` | Wipes documents, decisions, and audit logs while preserving templates, KB clauses, and users |

---

## Coding Style & Naming Conventions

- **TypeScript strict mode** (`"strict": true`) — no `any`.
- **Path alias**: `@/*` resolves to the project root (`./*`).
- **Naming**: `camelCase` for files in `services/`, `agents/`, `lib/`, and `tests/`; `PascalCase` for React components in `components/`.
- **Indentation**: 2-space. Follow existing patterns in adjacent files.
- **Styling**: Tailwind CSS 3 with custom design tokens defined as CSS variables in `app/globals.css` and mapped in `tailwind.config.ts`. Use semantic token classes (`text-primary`, `bg-surface`, `border`, etc.) rather than raw hex values.
- **Comments**: JSDoc on every exported function. Keep comments focused on *why*, not *what*.

---

## Testing Guidelines

**Framework:** Playwright (`@playwright/test` v1.60). Tests live in `tests/e2e/`.

- **`feature-verification.spec.ts`** — primary test suite covering core workflows (46 tests, 12 groups).
- **`full-suite.spec.ts`** — extended coverage.
- Config in `playwright.config.ts` (base URL `localhost:3000`, 5 workers, fully parallel, 60s timeout).
- Reports output to `tests/e2e/report/` (HTML + JSON).

**To run tests:**
1. Start dev: `npm run dev`
2. Run: `npm run test:browser`
3. Or one-shot: `bash test.sh`

**Manual testing** via API-driven workflows is documented in `TEST-MATRIX.md`. Use the Mock AI provider (default when `DEEPSEEK_API_KEY` is unset) for manual tests. Variant test contracts for manual uploads live in `test-contracts/variants/`.

---

## Commit & Pull Request Guidelines

Use descriptive commit messages following conventional commit format (e.g., `feat: add clause extraction agent`, `fix: resolve audit-log race condition`). PR descriptions should reference the relevant workflow step from `TEST-MATRIX.md` and note any manual verification performed.

**Git email:** GitHub rejects pushes with private emails on this repo. Commits must use the noreply address:
```
git config user.email "saleem07861@users.noreply.github.com"
```
If a commit is rejected with `GH007`, amend it with `git commit --amend --no-edit --reset-author` after setting the config above.

---

## Environment & Configuration

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — PostgreSQL connection string (used by Prisma and the runtime adapter)
- `DEEPSEEK_API_KEY` — primary AI provider (mock fallback when empty)
- `AUTH_SECRET` — NextAuth v5 session encryption secret
- `NEXTAUTH_URL` — public URL for NextAuth callbacks (e.g. `https://sentinel.eportfolios.co.uk`)
- `DOMAIN` — deployment domain (used by `deploy.sh`)

API keys can also be set per-organisation via the Settings UI; org-level keys take precedence over environment variables. See `agents/aiClientFactory.ts` for provider selection logic.

---

## Production Deployment

**Server:** IONOS VPS at `87.106.69.152` running Plesk. SSH access via Plesk SSH Terminal extension (Tools & Settings → SSH Terminal). Standard SSH on port 22 is blocked — must use the Plesk web terminal.

**App location:** `/opt/sentinel-ai`  
**Domain:** `sentinel.eportfolios.co.uk` (SSL via Let's Encrypt)  
**Process manager:** PM2  
**Reverse proxy:** Apache (via Plesk) with ProxyPass to `http://127.0.0.1:3000`

### Deployment Workflow (CRITICAL — read this first)

**The Plesk SSH Terminal has a narrow width and WRAPS long commands, corrupting them.** Never give the user a long `&&` chain — it will break. Instead, ALWAYS use the short scripts.

**When pushing code locally, always do:**
```bash
git add -A && git commit -m "description" && git push
```

Then tell the user which script to run: `bash update.sh` (or `bash dbupdate.sh` if schema/packages changed).

If the scripts don't exist yet on the VPS: `git pull && bash update.sh`

**Alternative:** `deploy.sh` provides a complete fresh-deployment flow with Nginx + Certbot for non-Plesk environments.

### PM2 Quirks

- **Always use `pm2 delete all` then `pm2 start`** — never `pm2 restart` after env changes (PM2 caches old env).
- **Start command:** `pm2 start node_modules/.bin/next --name sentinel-ai -- start`
- **DO NOT use `pm2 start npm --name sentinel-ai -- start`** — this starts npm without args.
- **Check status:** `pm2 status`
- **View logs:** `pm2 logs sentinel-ai --lines 20 --nostream`

### Critical Configuration Rules

- **`env.prod`** is the single source of truth for production config. Always update it locally, never edit `.env` directly on the VPS.
- **DATABASE_URL must use the Neon pooler hostname** — e.g. `ep-wandering-pond-ab5jidta-pooler.eu-west-2.aws.neon.tech` (note the `-pooler` suffix).
- **No quotes around values** in `.env` — Prisma 7's `env()` function includes quote characters in the string.
- **`sslmode=require`** — not `verify-full`.
- **`npm install`** (not `npm ci --production`) — tailwindcss is a devDependency needed at build time.
- **Never use `prisma migrate dev`** on the VPS — it fails. Use `npx tsx prisma/seed.ts` for data.

### Common Fixes

| Problem | Fix |
|---|---|
| 503 Service Unavailable | `pm2 status` — process probably crashed. `pm2 delete all && pm2 start node_modules/.bin/next --name sentinel-ai -- start` |
| Authentication failed (P1000) | Wrong password in DATABASE_URL. Check Neon dashboard. Update `env.prod` locally and push. |
| Can't reach database (P1001) | Wrong hostname. Must use `-pooler` suffix. |
| Build fails with "Cannot find module tailwindcss" | Run `npm install` (not `npm ci --production`). |
| Terminal wraps commands | Use `bash update.sh` instead of long `&&` chains. |
| pm2 shows npm help text | Wrong start command. Use `pm2 start node_modules/.bin/next --name sentinel-ai -- start`. |
| .env has line breaks in URL | Terminal wrapping corrupted the file. Use `git pull` and `cp env.prod .env` to restore. |

### User Roles

| User | Email | Password | Role | Can Access |
|---|---|---|---|---|
| Admin | `admin@sentinel.ai` | `admin123` | admin | Everything (Dashboard, Docs, Clauses, Decisions, Knowledge, Audit, People, Settings) |
| Sarah Okafor | `sarah@meridian.legal` | `admin123` | teamLeader | Everything except Settings |
| James Whitfield | `james@meridian.legal` | `admin123` | associate | Dashboard, Docs, Clauses, Decisions, Knowledge only |

Roles defined in `lib/auth/users.ts` (hardcoded demo users + DB-backed `Person` records, all default to password `admin123`, changeable via My Team). Nav filtering in `components/nav.tsx`. Page-level guards on Audit, People, and Settings pages. Auth handled by `RootLayout` session check (middleware is a no-op — disabled due to Edge Runtime crypto incompatibility).
