import { test, expect } from "./helpers/allure";
import { sectionSkipSurvey } from "./helpers/fixtures";
import { openPublicPreview, setupApiMocks } from "./helpers/setup";

test.describe("Workflow: Section Skip Logic", () => {
  test("skip path hides required in-section follow-ups and allows progression", async ({ page }) => {
    const survey = sectionSkipSurvey();
    await setupApiMocks(page, { surveyOverride: survey });
    await openPublicPreview(page, survey.publicId);

    await expect(page.getByRole("heading", { name: "Path choice" })).toBeVisible();
    await page.getByRole("radio", { name: "Skip path" }).click();

    await expect(page.getByRole("heading", { name: "Q2" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Q3" })).toHaveCount(0);

    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(page.getByText(/Section:\s*Section 2/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Q4" })).toBeVisible();
  });

  test("continue path keeps section questions visible and required", async ({ page }) => {
    const survey = sectionSkipSurvey();
    await setupApiMocks(page, { surveyOverride: survey });
    await openPublicPreview(page, survey.publicId);

    await page.getByRole("radio", { name: "Continue path" }).click();
    await expect(page.getByRole("heading", { name: "Q2" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Q3" })).toBeVisible();

    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });
});
