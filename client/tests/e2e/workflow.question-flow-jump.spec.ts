import { test, expect } from "./helpers/allure";
import { questionFlowJumpSurvey } from "./helpers/fixtures";
import { openPublicPreview, setupApiMocks } from "./helpers/setup";

test.describe("Workflow: Question Flow Jump", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: questionFlowJumpSurvey() });
  });

  test("Yes jumps directly to Q9 and submits from terminal question", async ({
    page,
  }) => {
    await openPublicPreview(page, "pub-q-jump-1");

    await expect(page.getByRole("heading", { name: "Q1" })).toBeVisible();
    await page.getByRole("radio", { name: "Yes" }).click();
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByRole("heading", { name: "Q9" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Q8" })).toHaveCount(0);

    await page.getByRole("textbox").fill("answer q9");
    await page.getByRole("button", { name: /Submit Survey/i }).click();
    await expect(
      page.getByText(/Thank you|validated successfully|submitted/i).first()
    ).toBeVisible();
  });

  test("No jumps to Q8 and submits without crossing to Q9", async ({ page }) => {
    await openPublicPreview(page, "pub-q-jump-1");

    await expect(page.getByRole("heading", { name: "Q1" })).toBeVisible();
    await page.getByRole("radio", { name: "No" }).click();
    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByRole("heading", { name: "Q8" })).toBeVisible();
    await page.getByRole("textbox").fill("answer q8");
    await expect(page.getByRole("heading", { name: "Q9" })).toHaveCount(0);
    const submitButton = page.getByRole("button", { name: /Submit Survey/i });
    const nextButton = page.getByRole("button", { name: /^Next$/i });
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
    } else {
      await nextButton.click();
      await expect(page.getByRole("heading", { name: "Q9" })).toHaveCount(0);
      await page.getByRole("button", { name: /Submit Survey/i }).click();
    }
    await expect(
      page.getByText(/Thank you|validated successfully|submitted/i).first()
    ).toBeVisible();
  });
});
