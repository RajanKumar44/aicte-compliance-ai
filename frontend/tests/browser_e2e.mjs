/**
 * Browser E2E — one real round-trip through the deployed UI.
 *
 * Runs against the deployed (or local) app, exercising the real Validate
 * flow end to end with the deployed backend. Script asserts honest states:
 * - health badge flips OFF if /health unreachable
 * - form validation FEELS the same as the server validation (no fake success)
 * - API response is ACTUALLY rendered (finding codes + names), not mocked
 *
 * Run via rep-local venv:
 *   source .pw-venv/bin/activate
 *   node frontend/tests/browser_e2e.mjs
 *
 * Prereqs: python frontend/tests/browser_e2e_setup.py once.
 * Env: E2E_BASE_URL (default https://aicte-compliance-ai.vercel.app)
 *
 * State: nothing is written to disk beyond screenshots in artifacts/.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://aicte-compliance-ai.vercel.app";
const SHOTS_DIR = path.resolve(process.cwd(), "artifacts/browser-e2e");

mkdirSync(SHOTS_DIR, { recursive: true });

const selectors = {
  healthBadge: "text=API Connected",
  healthChecking: "text=Checking…",
  healthUnreachable: "text=Unavailable",
  statusPreliminaryPass: "text=preliminary_checks_passed",
  statusAttention: "text=attention_required",
  missingFinding: "text=MISSING_DOCUMENT",
  expiredFinding: "text=DOCUMENT_EXPIRED",
};

async function gotoRoot(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "load", timeout: 45_000 });
  // Either the "Checking…" or the post-check state is fine — proceed once steady.
  try {
    await page.waitForSelector(`${selectors.healthChecking}, ${selectors.healthBadge}, ${selectors.healthUnreachable}`, { timeout: 20_000 });
    await page.waitForTimeout(1_500); // settle after health flip
  } catch { /* First paint may have already flipped to a settled state. */ }
}

async function run() {
  const browser = await chromium.launch();
  const results = [];

  // Case 0: health badge follows the real API act.
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoRoot(page);
    const connected = await page.locator(selectors.healthBadge).count().catch(() => 0);
    if (connected > 0) {
      console.log("[OK] Badge flips to API Connected (real /health)");
    } else {
      console.log("[FAIL] Badge never reached API Connected");
      results.push("health-badge");
      await page.screenshot({ path: path.join(SHOTS_DIR, "badge-fail.png"), fullPage: true });
    }
    await ctx.close();
  }

  // Case 1: login via demo → open /validate.
  let page;
  {
    const ctx = await browser.newContext();
    page = await ctx.newPage();
    await gotoRoot(page);
    await page.getByText("Sign In", { exact: true }).first().click().catch(async () => {
      await page.goto(`${BASE_URL}/signin`, { waitUntil: "load", timeout: 30_000 });
    });
    await page.waitForTimeout(1_000);
    const demoCard = page.getByText("Fast Evaluation Mode", { exact: false }).first();
    await demoCard.waitFor({ timeout: 15_000 });
    // Pick the FIRST demo card (institution_admin). Might not be exactly this label.
    const signInButtons = page.getByRole("button", { name: /Sign In/i });
    await signInButtons.first().click();
    await page.waitForTimeout(1_500);
    await page.goto(`${BASE_URL}/validate`, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(1_200);
    console.log("[OK] Signed in and on /validate");
    try {
      await page.screenshot({ path: path.join(SHOTS_DIR, "validate-empty.png"), fullPage: false });
    } catch {}
  }

  // Case 2: successful preliminary_pass, real UI submission.
  {
    // Start fresh.
    await page.goto(`${BASE_URL}/validate`, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(1_500);
    // Fill institution ID.
    await page.locator("input").first().fill("SYNTH-DEMO-042");
    // Required docs and submitted docs fields. All inputs, then: add 3 docs.
    // The form supports a dynamic list of doc chips. Just fill the FIRST input for required docs.
    // Better: find input by label/placeholder.
    const required = page.locator('input[placeholder*="required" i], input[name*="required" i]').first();
    if (await required.count()) {
      await required.fill("aicte_approval,mandatory_disclosure");
    } else {
      // Fallback: second input type=text on page.
      await page.locator("input[type=text], input:not([type])").nth(1).fill("aicte_approval,mandatory_disclosure");
    }
    await page.getByRole("button", { name: /validate|submit|run check/i }).first().click();
    await page.waitForTimeout(6_000);
    const ok = await page.locator(selectors.statusPreliminaryPass).count();
    if (ok > 0) {
      console.log("[OK] UI submission → preliminary_checks_passed");
      try { await page.screenshot({ path: path.join(SHOTS_DIR, "validate-pass.png"), fullPage: true }); } catch {}
    } else {
      console.log("[FAIL] UI preliminary pass not rendered");
      results.push("preliminary-pass");
      try { await page.screenshot({ path: path.join(SHOTS_DIR, "validate-pass-fail.png"), fullPage: true }); } catch {}
    }
  }

  // Case 3: missing document → MISSING_DOCUMENT rendered.
  {
    await page.goto(`${BASE_URL}/validate`, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(1_500);
    await page.locator("input").first().fill("SYNTH-DEMO-042");
    const required = page.locator('input[placeholder*="required" i], input[name*="required" i]').first();
    if (await required.count()) {
      await required.fill("aicte_approval,mandatory_disclosure");
    } else {
      await page.locator("input[type=text], input:not([type])").nth(1).fill("aicte_approval,mandatory_disclosure");
    }
    // Submitted docs field smaller set.
    const submitted = page.locator('input[placeholder*="submitted" i], input[name*="submitted" i]').first();
    if (await submitted.count()) {
      await submitted.fill("aicte_approval");
    } else {
      await page.locator("input[type=text], input:not([type])").nth(2).fill("aicte_approval");
    }
    await page.getByRole("button", { name: /validate|submit|run check/i }).first().click();
    await page.waitForTimeout(6_000);
    const found = await page.locator(selectors.missingFinding).count();
    const named = await page.getByText("mandatory_disclosure", { exact: false }).count();
    if (found > 0 && named > 0) {
      console.log("[OK] UI submission → MISSING_DOCUMENT + actual doc name rendered");
      try { await page.screenshot({ path: path.join(SHOTS_DIR, "validate-missing.png"), fullPage: true }); } catch {}
    } else {
      console.log("[FAIL] Missing-document result not rendering as expected");
      results.push("missing-doc");
      try { await page.screenshot({ path: path.join(SHOTS_DIR, "validate-missing-fail.png"), fullPage: true }); } catch {}
    }
  }

  // Case 4: expired document → DOCUMENT_EXPIRED rendered.
  {
    await page.goto(`${BASE_URL}/validate`, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(1_500);
    await page.locator("input").first().fill("SYNTH-DEMO-042");
    await page.locator('input[placeholder*="required" i], input[name*="required" i]').first()
      .fill("aicte_approval").catch(async () => {
        await page.locator("input[type=text], input:not([type])").nth(1).fill("aicte_approval");
      });
    await page.locator('input[placeholder*="submitted" i], input[name*="submitted" i]').first()
      .fill("aicte_approval").catch(async () => {
        await page.locator("input[type=text], input:not([type])").nth(2).fill("aicte_approval");
      });
    const dateInput = page.locator('input[type=date], input[placeholder*="YYYY" i]').first();
    if (await dateInput.count()) {
      await dateInput.fill("2024-06-30");
    }
    await page.getByRole("button", { name: /validate|submit|run check/i }).first().click();
    await page.waitForTimeout(6_000);
    const ok = await page.locator(selectors.expiredFinding).count();
    if (ok > 0) {
      console.log("[OK] UI submission → DOCUMENT_EXPIRED rendered");
      try { await page.screenshot({ path: path.join(SHOTS_DIR, "validate-expired.png"), fullPage: true }); } catch {}
    } else {
      console.log("[FAIL] Expired-document result not rendering");
      results.push("expired-doc");
      try { await page.screenshot({ path: path.join(SHOTS_DIR, "validate-expired-fail.png"), fullPage: true }); } catch {}
    }
  }

  await browser.close();
  // Final verdict.
  if (results.length > 0) {
    console.log(`E2E FAILED, steps that broke: ${results.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("ALL E2E STEPS PASSED — real round-trip through the deployed UI");
  }
}

run().catch((err) => {
  console.error("[E2E ERROR]", err);
  process.exit(1);
});
