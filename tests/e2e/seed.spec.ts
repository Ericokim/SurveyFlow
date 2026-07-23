import { expect, test } from "@playwright/test";

/**
 * Seed file used by the Playwright agents (planner / generator / healer)
 * as the starting environment for generated specs.
 */
test.describe("Test group", () => {
  test("seed", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SurveyFlow/);
  });
});
