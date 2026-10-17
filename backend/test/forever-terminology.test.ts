import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL(
  import.meta.url.includes("/dist/") ? "../../../" : "../../",
  import.meta.url
);
const currentFiles = [
  "README.md",
  "backend/.env.example",
  "backend/routes/analytics.routes.ts",
  "backend/routes/payment.routes.ts",
  "backend/routes/user.routes.ts",
  "backend/services/ai/ai-limits.service.ts",
  "backend/services/billing/plan-entitlements.service.ts",
  "src/api/AiApi.ts",
  "src/api/PaymentApi.ts",
  "src/components/profile/ProfilePreferencesPanel.tsx",
  "src/pages/AnalyticsPage.tsx",
  "src/pages/OfferPage.tsx",
  "src/pages/PricingPage.tsx",
  "src/pages/SettingsPage.tsx",
  "src/pages/TermsOfServicePage.tsx",
  "docs/ai-unit-economics.md",
  "docs/architecture.md",
  "docs/demo-hosting.md",
];

test("current product surfaces use Forever as the only lifetime-plan name", async () => {
  const retiredName = ["found", "er"].join("");
  const violations: string[] = [];

  for (const relativePath of currentFiles) {
    const contents = await readFile(new URL(relativePath, repositoryRoot), "utf8");
    const currentLines = contents
      .split("\n")
      .filter((line) => !line.includes("docs/releases/"));

    currentLines.forEach((line, index) => {
      if (line.toLowerCase().includes(retiredName)) {
        violations.push(`${relativePath}:${index + 1}`);
      }
    });
  }

  assert.deepEqual(violations, []);
});
