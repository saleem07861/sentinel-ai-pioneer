# Sentinel AI — Complete Workflow

> Last updated: 2026-06-02 · AI Provider: Mock (offline fallback)

---

## User Accounts

| User | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@sentinel.ai` | `admin123` | admin |
| Sarah Okafor | `sarah@meridian.legal` | `admin123` | teamLeader |
| James Whitfield | `james@meridian.legal` | `admin123` | associate |

All new accounts default to password `admin123`. Change it in My Team → click name → New password field.

---

## Step 1 — Upload

1. Go to **Documents** → click **Upload Contract**
2. Select a `.txt`, `.pdf`, or `.docx` file
3. Enter the **Company Name** (e.g. "Brightwave Solutions Ltd")
4. **Select a template** to compare against (required — marked with red `*`)
5. Click **Upload**

**What happens automatically:**
- Text extracted from the file
- Contract metadata detected (parties, contract type, date)
- Company name merged into parties list
- AI extracts and classifies every clause
- Each clause matched to the standard template by title
- KB approved clauses checked for auto-matching
- Document-level AI review runs immediately
- Risk score calculated

**Result:** Document appears in the list with status UNDER_REVIEW. Blue **Review →** button on the right.

---

## Step 2 — Review Clauses

1. Click **Review →** on the document row
2. Only clauses needing attention are shown (STANDARD clauses are hidden)
3. Header shows: "Clauses (X need review, Y standard)"

**For each clause you see:**

| Action | When to use | What happens |
|---|---|---|
| **✓ Accept** | Clause is acceptable as-is | Marks reviewed, progress advances |
| **✎ Edit** | Needs minor changes | Opens side-by-side editor — standard on left, your edit on right |
| **⚑ Flag** | Unacceptable — must escalate | Marks for team leader attention |

**Side-by-side view:**
- Left panel: **Standard** (green badge) — approved template text
- Right panel: **Submitted** (coloured badge) — uploaded contract text
- Status chip shows: STANDARD / DEVIATION / FLAGGED
- Amber **AI Assessment** box explains what the AI found

**Save for future contracts:** After accepting or editing, click **"Save for future contracts"** to add the clause to the approved knowledge base. Future uploads will match against both standard templates AND your saved edits.

---

## Step 3 — Final Decision

The **"Ready for Final Decision"** callout appears on the right sidebar **only after all non-STANDARD clauses are accepted**.

1. Click **Record Final Decision**
2. Your name is auto-filled (no dropdown — it's you)
3. Choose outcome: ACCEPTED / REJECTED / NEGOTIATED / ESCALATED / DEFERRED
4. Add optional notes
5. Click **Confirm ACCEPTED** (or your chosen outcome)

**What happens:**
- Document status updates (APPROVED or REJECTED)
- Decision recorded in audit trail
- APPROVED documents get a green **Download** button

---

## Sidebar Reference

| Section | Content |
|---|---|
| **Summary Analysis** | AI findings + risk badge + confidence %. Runs automatically on upload. |
| **Risk Score** | 0-100 score. Drops as clauses are reviewed. |
| **Ready for Final Decision** | Blue callout box — appears only when all clauses accepted. Contains the decision form. |
| **Decision History** | Past decisions with outcome badges — shown after a decision is recorded. |

---

## Role Permissions

| Page | admin | teamLeader | associate |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Documents (upload, review) | ✅ | ✅ | ✅ |
| Clauses | ✅ | ✅ | ✅ |
| Decisions | ✅ | ✅ | ✅ |
| Knowledge | ✅ | ✅ | ✅ |
| Audit Trail | ✅ | ❌ | ❌ |
| People (My Team) | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ |

---

## Test Contracts

5 variant contracts in `test-contracts/variants/` — each ~95% identical to the DB standard template with specific deviations:

| File | Template | Deviations |
|---|---|---|
| `saas-variant.txt` | Standard SaaS | §1 Liability cap 2x→1x, §3 Notice 30→90 days, §5 Survival 3→6 years |
| `nda-variant.txt` | Standard NDA | §2 Added adviser disclosure, §4 Term 3→5 years, Survival 5→7 years |
| `dpa-variant.txt` | Standard DPA | §1 Added 12-month archival, §5 Breach 48h→72h, §6 Deletion 30→60 days |
| `psa-variant.txt` | Standard PSA | §2 Payment 30→45 days, §5 PI Insurance £2M→£1M |
| `order-form-variant.txt` | Standard Order Form | §3 Payment 30→45 days, §4 Non-renewal 90→60 days |

---

## Utility Scripts

| Script | Purpose |
|---|---|
| `bash update.sh` | Deploy code changes (no schema/package changes) |
| `bash dbupdate.sh` | Deploy with DB schema or package changes |
| `bash test.sh` | Run Playwright E2E tests locally |
| `bash clear.sh` | Wipe documents + decisions, keep templates + KB clauses |
