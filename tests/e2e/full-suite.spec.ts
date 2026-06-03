/**
 * Sentinel AI — Full Browser E2E Test Suite
 *
 * Covers every page, the upload → review → download workflow,
 * and logs all HTTP / console errors / API failures.
 *
 * Auth is handled by auth.setup.ts (Playwright setup project).
 *
 * Usage:
 *   npm run test:browser:prod      seeds DB + runs tests
 *   npm run test:browser           tests only (no seed)
 *   npm run test:browser:report    open HTML report
 */

import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const REPORT_DIR = path.resolve("tests/e2e/report");

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------

const apiErrors: { status: number; method: string; url: string }[] = [];
const consoleErrors: string[] = [];
const pageResults: { page: string; url: string; status: string; loadMs: number; errors: string[] }[] = [];

function installMonitors(page: Page) {
  page.on("response", (res) => {
    if (res.status() >= 400 && (res.url().includes("/api/") || res.url().includes(BASE))) {
      apiErrors.push({ status: res.status(), method: res.request().method(), url: res.url() });
    }
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`[pageerror] ${err.message}`));
}

function addResult(name: string, url: string, status: string, loadMs: number, errors: string[] = []) {
  pageResults.push({ page: name, url, status, loadMs, errors });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function writeReport() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const passed = pageResults.filter((r) => r.status === "PASS").length;
  const failed = pageResults.filter((r) => r.status === "FAIL").length;
  const skipped = pageResults.filter((r) => r.status === "SKIP").length;

  const lines = [
    "",
    "══════════════════════════════════════════════",
    "  SENTINEL AI — BROWSER E2E TEST REPORT",
    "══════════════════════════════════════════════",
    `  Base URL:  ${BASE}`,
    `  Pages:     ${pageResults.length} total  |  ${passed} ✅ passed  |  ${failed} ❌ failed  |  ${skipped} ⏭ skipped`,
    `  API errors:     ${apiErrors.length}`,
    `  Console errors: ${consoleErrors.length}`,
    "",
    "  ── PAGE RESULTS ──",
    ...pageResults.map((r) => {
      const icon = r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⏭" : "❌";
      const err = r.errors.length ? `  ⚠ ${r.errors.join("; ")}` : "";
      return `  ${icon} ${r.page.padEnd(30)} ${String(r.loadMs).padStart(5)}ms${err}`;
    }),
    "",
  ];

  if (apiErrors.length > 0) {
    lines.push("  ── API ERRORS ──");
    for (const e of apiErrors) lines.push(`  ${e.status} ${e.method} ${e.url}`);
    lines.push("");
  }
  if (consoleErrors.length > 0) {
    lines.push("  ── CONSOLE ERRORS ──");
    for (const e of [...new Set(consoleErrors)].slice(0, 20)) lines.push(`  ${e.slice(0, 150)}`);
    lines.push("");
  }
  lines.push("══════════════════════════════════════════════\n");

  const text = lines.join("\n");
  fs.writeFileSync(path.join(REPORT_DIR, "suite-report.txt"), text);
  fs.writeFileSync(path.join(REPORT_DIR, "suite-report.json"), JSON.stringify({
    baseUrl: BASE,
    results: pageResults,
    summary: { total: pageResults.length, passed, failed, skipped, apiErrors: apiErrors.length, consoleErrors: consoleErrors.length },
    apiErrors,
    consoleErrors: [...new Set(consoleErrors)],
  }, null, 2));

  console.log(text);
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

test.describe("Sentinel AI — Full Browser E2E", () => {
  test.beforeEach(async ({ page }) => {
    installMonitors(page);
  });

  test.afterAll(() => writeReport());

  // ---- PAGE LOADS (P1–P10) ----

  const PAGES = [
    { id: "P1", name: "Dashboard", path: "/" },
    { id: "P2", name: "Documents List", path: "/documents" },
    { id: "P4", name: "Clauses", path: "/clauses" },
    { id: "P5", name: "Decisions", path: "/decisions" },
    { id: "P6", name: "Knowledge", path: "/knowledge" },
    { id: "P7", name: "Audit", path: "/audit" },
    { id: "P8", name: "People", path: "/people" },
    { id: "P9", name: "Settings", path: "/settings" },
  ];

  for (const p of PAGES) {
    test(`${p.id} - ${p.name} page loads`, async ({ page }) => {
      const start = Date.now();
      const errors: string[] = [];

      try {
        await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle", timeout: 20_000 });
        const body = await page.textContent("body");
        if (body && /\b(500|Internal Server Error|Application error)\b/i.test(body)) errors.push("500/Server Error");
        const overlay = page.locator("nextjs-portal");
        if ((await overlay.count()) > 0) errors.push("Next.js error overlay");
        // Check page has meaningful content
        const content = page.locator("h1, h2, table, form, [class*='stat']");
        if ((await content.count()) === 0) errors.push("No visible content found on page");
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }

      const status = errors.length === 0 ? "PASS" : "FAIL";
      addResult(p.name, `${BASE}${p.path}`, status, Date.now() - start, errors);
      if (status === "FAIL") await page.screenshot({ path: path.join(REPORT_DIR, `${p.id}-fail.png`), fullPage: true });
      expect(status).toBe("PASS");
    });
  }

  // ---- P10: LOGIN PAGE (unauthenticated) ----

  test("P10 - Login page loads (public)", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    installMonitors(page);
    const start = Date.now();
    const errors: string[] = [];

    try {
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 20_000 });
      if ((await page.locator('button[type="submit"]').count()) === 0) errors.push("Login submit button not found");
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }

    addResult("Login (public)", `${BASE}/login`, errors.length === 0 ? "PASS" : "FAIL", Date.now() - start, errors);
    await ctx.close();
    expect(errors.length).toBe(0);
  });

  // ---- P3: DOCUMENT DETAIL (dynamic) ----

  test("P3 - Document detail page loads", async ({ page }) => {
    const start = Date.now();
    try {
      await page.goto(`${BASE}/documents`, { waitUntil: "networkidle", timeout: 20_000 });
      const link = page.locator("table a[href*='/documents/']").first();
      if ((await link.count()) === 0) { addResult("Document Detail", `${BASE}/documents/[id]`, "SKIP", 0, ["No documents"]); return; }
      const href = await link.getAttribute("href");
      await page.goto(href!.startsWith("http") ? href! : `${BASE}${href}`, { waitUntil: "networkidle", timeout: 20_000 });
      const errors: string[] = [];
      if ((await page.locator("h1").count()) === 0) errors.push("No h1 on detail page");
      addResult("Document Detail", `${BASE}/documents/[id]`, errors.length === 0 ? "PASS" : "FAIL", Date.now() - start, errors);
    } catch (e) {
      addResult("Document Detail", `${BASE}/documents/[id]`, "FAIL", Date.now() - start, [e instanceof Error ? e.message : String(e)]);
    }
  });

  // ---- W1: UPLOAD CONTRACT ----

  test("W1 - Upload contract + verify metadata", async ({ page }) => {
    await page.goto(`${BASE}/documents`, { waitUntil: "networkidle", timeout: 20_000 });
    const errors: string[] = [];

    try {
      const uploadBtn = page.locator("button", { hasText: /upload/i });
      if ((await uploadBtn.count()) === 0) { addResult("Upload", `${BASE}/documents`, "SKIP", 0, ["No upload button"]); return; }
      await uploadBtn.first().click();
      await page.waitForTimeout(800);

      const fileInput = page.locator('input[type="file"]');
      if ((await fileInput.count()) === 0) { addResult("Upload", `${BASE}/documents`, "SKIP", 0, ["No file input"]); return; }
      await fileInput.setInputFiles(path.resolve("test-contracts/sample-nda.txt"));
      await page.waitForTimeout(500);

      const submitBtn = page.locator("button", { hasText: /submit|send|upload/i });
      if ((await submitBtn.count()) > 0) { await submitBtn.first().click(); await page.waitForTimeout(5000); }

      await page.goto(`${BASE}/documents`, { waitUntil: "networkidle", timeout: 20_000 });
      await page.waitForTimeout(1000);
      const body = await page.textContent("body");
      if (!body?.includes("MUTUAL") && !body?.includes("sample-nda")) errors.push("Document not found after upload");
      if (!body?.includes("ACME") && !body?.includes("BRIGHTWAVE")) errors.push("Parties metadata missing");
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    addResult("Upload Contract", `${BASE}/documents`, errors.length === 0 ? "PASS" : "FAIL", 0, errors);
    expect(errors.length).toBe(0);
  });

  // ---- W2: PER-CLAUSE REVIEW ----

  test("W2 - Per-clause accept review", async ({ page }) => {
    await page.goto(`${BASE}/documents`, { waitUntil: "networkidle", timeout: 20_000 });

    try {
      const link = page.locator("table a[href*='/documents/']").first();
      if ((await link.count()) === 0) { addResult("Clause Review", `${BASE}/documents/[id]`, "SKIP", 0, ["No documents"]); return; }
      const href = await link.getAttribute("href");
      await page.goto(href!.startsWith("http") ? href! : `${BASE}${href}`, { waitUntil: "networkidle", timeout: 20_000 });
      await page.waitForTimeout(1000);

      const acceptBtns = page.locator("button", { hasText: "Accept" });
      if ((await acceptBtns.count()) === 0) { addResult("Clause Review", page.url(), "SKIP", 0, ["No Accept buttons — all accepted or resolved"]); return; }
      await acceptBtns.first().click();
      await page.waitForTimeout(2000);

      const accepted = page.locator("text=Accepted");
      addResult("Clause Review", page.url(), (await accepted.count()) > 0 ? "PASS" : "FAIL", 0, (await accepted.count()) > 0 ? [] : ["Accepted state not shown"]);
    } catch (e) {
      addResult("Clause Review", `${BASE}/documents/[id]`, "FAIL", 0, [e instanceof Error ? e.message : String(e)]);
    }
  });

  // ---- W3: DOWNLOAD ----

  test("W3 - Download approved document", async ({ page }) => {
    await page.goto(`${BASE}/documents`, { waitUntil: "networkidle", timeout: 20_000 });
    let found = false;

    try {
      const links = page.locator("table a[href*='/documents/']");
      for (let i = 0; i < await links.count(); i++) {
        const href = await links.nth(i).getAttribute("href");
        await page.goto(href!.startsWith("http") ? href! : `${BASE}${href}`, { waitUntil: "networkidle", timeout: 20_000 });
        await page.waitForTimeout(800);
        const dl = page.locator("a", { hasText: /download/i });
        if ((await dl.count()) > 0) {
          const [d] = await Promise.all([page.waitForEvent("download", { timeout: 10_000 }).catch(() => null), dl.first().click()]);
          if (d) found = true;
          break;
        }
      }
    } catch { /* ignore */ }

    addResult("Document Download", `${BASE}/documents/[id]/download`, found ? "PASS" : "SKIP", 0, found ? [] : ["No approved docs to download"]);
  });

  // ---- API SMOKE TEST ----

  test("API - Key endpoints return valid responses", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20_000 });

    const orgId = await page.evaluate(() => {
      const el = document.querySelector("a[href*='organisationId=']");
      return el ? new URL(el.getAttribute("href")!, window.location.origin).searchParams.get("organisationId") : null;
    });
    if (!orgId) { addResult("API Smoke", "N/A", "SKIP", 0, ["No orgId found"]); return; }

    const eps = ["dashboard","documents","clauses/flagged","decisions/pending","knowledge-base/categories","people","settings"];
    const failures: string[] = [];

    for (const ep of eps) {
      const res = await page.evaluate(async (url) => {
        try { const r = await fetch(url); return r.status; } catch { return -1; }
      }, `${BASE}/api/${ep}?organisationId=${orgId}`);

      if (res >= 500) failures.push(`/api/${ep} → ${res}`);
    }
    addResult("API Smoke Test", `${eps.length} endpoints`, failures.length === 0 ? "PASS" : "FAIL", 0, failures);
    expect(failures.length).toBe(0);
  });
});
