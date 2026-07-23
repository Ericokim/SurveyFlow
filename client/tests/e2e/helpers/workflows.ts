import { expect, Page } from '@playwright/test';

export async function openPreviewInSameTab(page: Page) {
  await page.goto('/preview/draft');
  await expect(page.locator('body')).toBeVisible();
}

export async function chooseQuestionBasedSurvey(page: Page) {
  const trigger = page.getByText(/Questions|question-based|single page/i).first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click({ force: true });
  }
}

export async function chooseSectionBasedSurvey(page: Page) {
  const trigger = page.getByText(/Sections|section-based|multi-step/i).first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click({ force: true });
  }
}

export async function pickQuestionTypeFromDialog(page: Page, typeLabel: string) {
  const type = page.getByText(new RegExp(typeLabel, 'i')).first();
  await type.click({ force: true });
}

export async function pickQuestionTypeFromPopover(page: Page, typeLabel: string) {
  const type = page.getByText(new RegExp(typeLabel, 'i')).first();
  await type.click({ force: true });
}
