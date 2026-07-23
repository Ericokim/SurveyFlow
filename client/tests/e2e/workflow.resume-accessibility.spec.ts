import { test, expect } from "./helpers/allure";
import {
  baseQuestionSurvey,
  baseSectionSurvey,
  sectionSameSectionJumpSurvey,
} from "./helpers/fixtures";
import { openLiveSurvey, openPublicPreview, setupApiMocks } from "./helpers/setup";

test.describe("Workflow: Resume + Accessibility", () => {
  test("restores autosaved answers on resume in live mode", async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.publicId = "pub-resume-1";
    await setupApiMocks(page, { surveyOverride: survey });

    await openLiveSurvey(page, survey.publicId);
    const firstInput = page.getByRole("textbox").first();
    await firstInput.fill("Resumed value");

    await page.reload();

    await expect(page.getByRole("textbox").first()).toHaveValue("Resumed value");
  });

  test("restores identified draft progress from the database after local storage is cleared", async ({
    page,
  }) => {
    const survey = baseSectionSurvey();
    survey.publicId = "pub-resume-db-1";
    survey.isWhitelistEnabled = true;
    await setupApiMocks(page, {
      surveyOverride: survey,
      whitelistAllowedIdentifiers: ["allow@example.com"],
    });

    await openLiveSurvey(page, survey.publicId);
    await page
      .getByLabel(/whitelisted email or phone/i)
      .fill("allow@example.com");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("textbox").first().fill("Database resume");
    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(page.getByText("Section 2 question")).toBeVisible();

    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.reload();
    await page
      .getByLabel(/whitelisted email or phone/i)
      .fill("allow@example.com");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByRole("textbox").first()).toHaveValue(
      "Database resume"
    );
  });

  test("identified live progress saves only when the respondent clicks Next", async ({
    page,
  }) => {
    const survey = baseSectionSurvey();
    survey.publicId = "pub-explicit-save-1";
    survey.isWhitelistEnabled = true;

    let progressRequestCount = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes(`/api/r/${survey.publicId}/progress`)
      ) {
        progressRequestCount += 1;
      }
    });

    await setupApiMocks(page, {
      surveyOverride: survey,
      whitelistAllowedIdentifiers: ["allow@example.com"],
    });

    await openLiveSurvey(page, survey.publicId);
    await page
      .getByLabel(/whitelisted email or phone/i)
      .fill("allow@example.com");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("textbox").first().fill("No background save");
    await page.waitForTimeout(1200);

    await expect.poll(() => progressRequestCount).toBe(0);

    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(page.getByText("Section 2 question")).toBeVisible();
    await expect.poll(() => progressRequestCount).toBe(1);
  });

  test("stale draft state from older schema falls back safely without crash", async ({
    page,
  }) => {
    const survey = baseQuestionSurvey();
    survey.publicId = "pub-version-fallback-1";
    await page.addInitScript(({ publicId }) => {
      localStorage.setItem(
        `survey_draft_${publicId}_anon`,
        JSON.stringify({
          legacy_question_id: "legacy answer",
        })
      );
      localStorage.setItem(
        `survey_draft_${publicId}_anon_nav`,
        JSON.stringify({
          index: 99,
          history: ["legacy-section"],
          jumpChain: ["legacy-section"],
        })
      );
    }, { publicId: survey.publicId });

    await setupApiMocks(page, { surveyOverride: survey });
    await openLiveSurvey(page, survey.publicId);

    await expect(page.getByText(/Editor Survey/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Submit Survey|Next/i })).toBeVisible();
  });

  test("dynamic show/hide keeps next visible field focusable by keyboard users", async ({
    page,
  }) => {
    const survey = sectionSameSectionJumpSurvey();
    await setupApiMocks(page, { surveyOverride: survey });

    await openPublicPreview(page, survey.publicId);
    await page.getByRole("textbox").first().fill("Jane");
    await page.getByRole("radio", { name: "Kenyan" }).click();

    await expect(
      page.getByRole("heading", { name: "Specify your Nationality*" })
    ).toHaveCount(0);

    const countyInput = page.getByRole("textbox", { name: "County of Birth?" });
    await countyInput.focus();
    await expect(countyInput).toBeFocused();
  });
});
