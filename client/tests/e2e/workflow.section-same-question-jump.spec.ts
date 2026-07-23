import { test, expect } from "./helpers/allure";
import { sectionSameSectionJumpSurvey } from "./helpers/fixtures";
import {
  openDraftPreview,
  openPublicPreview,
  setupApiMocks,
  setupAuthenticatedPage,
} from "./helpers/setup";

test.describe("Workflow: Section Same-Section Jump", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: sectionSameSectionJumpSurvey() });
  });

  test("Kenyan path allows skipping required Q4 and continues to next section", async ({
    page,
  }) => {
    await openPublicPreview(page, "pub-s-jump-1");

    await expect(page.getByText(/Section:\s*Bio/i)).toBeVisible();
    await page.getByRole("textbox").first().fill("Jane");
    await page.getByRole("radio", { name: "Kenyan" }).click();
    await expect(
      page.getByRole("heading", { name: "Specify your Nationality*" })
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "County of Birth?*" })).toBeVisible();

    await page.getByRole("textbox", { name: "County of Birth?" }).fill("Eldoret");
    await expect(page.getByRole("textbox", { name: "County of Birth?" })).toHaveValue(
      "Eldoret"
    );

    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(
      page.getByRole("heading", { name: "Education", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Level of education")).toBeVisible();
    await expect(page.getByText(/This question is required/i)).toHaveCount(0);
  });

  test("Other path keeps Q4 required before section progression", async ({
    page,
  }) => {
    await openPublicPreview(page, "pub-s-jump-1");

    await expect(page.getByText(/Section:\s*Bio/i)).toBeVisible();
    await page.getByRole("textbox").first().fill("Jane");
    await page.getByRole("radio", { name: "Other" }).click();
    await expect(
      page.getByRole("heading", { name: "Specify your Nationality*" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "County of Birth?*" })).toHaveCount(0);

    await page.getByRole("button", { name: /^Next$/i }).click();

    await expect(page.getByText(/This question is required/i).first()).toBeVisible();

    await page.getByRole("textbox", { name: "Specify your Nationality" }).fill(
      "Ugandan"
    );
    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(
      page.getByRole("heading", { name: "Education", exact: true })
    ).toBeVisible();
  });

  test("Draft preview uses same-section jump visibility path", async ({
    page,
  }) => {
    await setupAuthenticatedPage(page);
    const survey = sectionSameSectionJumpSurvey();
    await openDraftPreview(page, survey);

    await expect(page.getByText(/Section:\s*Bio/i)).toBeVisible();
    await page.getByRole("textbox").first().fill("Jane");
    await page.getByRole("radio", { name: "Kenyan" }).click();

    await expect(
      page.getByRole("heading", { name: "Specify your Nationality*" })
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "County of Birth?*" })).toBeVisible();
  });

  test("Switching branch clears hidden branch text answers in public preview", async ({
    page,
  }) => {
    await openPublicPreview(page, "pub-s-jump-1");

    await page.getByRole("textbox").first().fill("Jane");
    await page.getByRole("radio", { name: "Other" }).click();
    await page.getByRole("textbox", { name: "Specify your Nationality" }).fill(
      "Ugandan"
    );

    await page.getByRole("radio", { name: "Kenyan" }).click();
    await expect(
      page.getByRole("heading", { name: "Specify your Nationality*" })
    ).toHaveCount(0);
    await page.getByRole("textbox", { name: "County of Birth?" }).fill("Nairobi");

    await page.getByRole("radio", { name: "Other" }).click();
    await expect(
      page.getByRole("textbox", { name: "Specify your Nationality" })
    ).toHaveValue("");
  });

  test("Switching branch clears hidden branch text answers in draft preview", async ({
    page,
  }) => {
    await setupAuthenticatedPage(page);
    const survey = sectionSameSectionJumpSurvey();
    await openDraftPreview(page, survey);

    await page.getByRole("textbox").first().fill("Jane");
    await page.getByRole("radio", { name: "Other" }).click();
    await page.getByRole("textbox", { name: "Specify your Nationality" }).fill(
      "Ugandan"
    );

    await page.getByRole("radio", { name: "Kenyan" }).click();
    await expect(
      page.getByRole("heading", { name: "Specify your Nationality*" })
    ).toHaveCount(0);
    await page.getByRole("textbox", { name: "County of Birth?" }).fill("Nairobi");

    await page.getByRole("radio", { name: "Other" }).click();
    await expect(
      page.getByRole("textbox", { name: "Specify your Nationality" })
    ).toHaveValue("");
  });
});
