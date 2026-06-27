import { expect, test } from '@playwright/test';

test('home permanece utilizável em viewport móvel', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#site-header')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
  expect(pageErrors).toEqual([]);
});
