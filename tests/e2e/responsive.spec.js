import { expect, test } from '@playwright/test';

test('home permanece utilizável e sem overflow', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#site-header')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();

  const dimensions = await page.locator('body').evaluate(element => ({
    content: element.scrollWidth,
    viewport: element.clientWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  if ((page.viewportSize()?.width || 0) <= 768) {
    const toggle = page.locator('.menu-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await expect(page.locator('#mobile-menu')).toContainText('Explorar');
  }

  expect(pageErrors).toEqual([]);
});

test('rotas públicas mantêm o layout dentro da viewport', async ({ page }) => {
  for (const route of ['/explorar', '/buscar', '/login', '/cadastro', '/creditos']) {
    await page.goto(route);
    const dimensions = await page.locator('body').evaluate(element => ({
      content: element.scrollWidth,
      viewport: element.clientWidth,
    }));
    expect(dimensions.content, `overflow horizontal em ${route}`)
      .toBeLessThanOrEqual(dimensions.viewport);
  }
});
