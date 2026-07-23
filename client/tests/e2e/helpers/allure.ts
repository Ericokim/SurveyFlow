import { test as base, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

export { expect };

export const test = base.extend<{ _allureAuto: void }>({
  _allureAuto: [
    async ({ page }, use, testInfo) => {
      const logs: string[] = [];
      const fileName = testInfo.file.split('/').pop() || 'unknown';
      const workflowFeature = fileName.replace('.spec.ts', '');
      const severity =
        /error|publish|response|required|non-linear|persistence/i.test(workflowFeature)
          ? 'critical'
          : 'normal';

      await allure.epic('Survey Application');
      await allure.feature(workflowFeature);
      await allure.story(testInfo.title);
      await allure.owner('QA Automation');
      await allure.label('layer', 'e2e');
      await allure.severity(severity === 'critical' ? 'critical' : 'normal');

      page.on('console', (msg) => {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      });

      page.on('pageerror', (err) => {
        logs.push(`[pageerror] ${err?.message || String(err)}`);
      });

      page.on('requestfailed', (request) => {
        logs.push(
          `[requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`
        );
      });

      await use();

      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('final-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });

      const dom = await page.content();
      await testInfo.attach('page-dom', {
        body: Buffer.from(dom),
        contentType: 'text/html',
      });

      await testInfo.attach('console-log', {
        body: Buffer.from(logs.join('\n') || 'No console errors/logs captured'),
        contentType: 'text/plain',
      });
      await testInfo.attach('page-url', {
        body: Buffer.from(page.url()),
        contentType: 'text/plain',
      });
    },
    { auto: true },
  ],
});
