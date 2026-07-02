import { expect, test } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@cineview.local';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'CineView@Admin2026';

test('a SPA inicia sem erros de módulo', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('#site-header')).toContainText('CineView');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.demo-account')).toHaveCount(2);
  expect(pageErrors).toEqual([]);
});

test('conta didática de usuário abre o catálogo populado', async ({ page }) => {
  await page.goto('/');
  await page.locator('.demo-account-user').click();
  await expect(page.locator('#email')).toHaveValue('usuario@cineview.local');
  await expect(page.locator('#password')).toHaveValue('CineView@User2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Duna: Parte Dois' })).toBeVisible();
  await expect(page.locator('.movie-card').first()).toBeVisible();
  expect(await page.locator('.movie-card').count()).toBeGreaterThanOrEqual(8);
  await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
});

test('usuário se cadastra, edita o perfil e não acessa o painel admin', async ({ page }) => {
  const suffix = Date.now().toString();
  const username = `user_${suffix}`;

  await page.goto('/cadastro');
  await page.locator('#username').fill(username);
  await page.locator('#reg-email').fill(`${username}@example.com`);
  await page.locator('#reg-password').fill('password-123');
  await page.locator('#reg-password2').fill('password-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page.locator(`a[href="/perfil/${username}"]`).first()).toBeVisible();
  await page.goto('/configuracoes');
  await page.locator('#display-name').fill('Usuário de Teste');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('#toast-container')).toContainText('Perfil atualizado');

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('admin cria filme local e conclui biblioteca e avaliação', async ({ page, context }) => {
  await page.goto('/admin/login');
  await page.locator('#admin-email').fill(adminEmail);
  await page.locator('#admin-password').fill(adminPassword);
  await page.getByRole('button', { name: 'Entrar como Admin' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const csrfCookie = (await context.cookies()).find(cookie => cookie.name === 'csrf_token');
  expect(csrfCookie).toBeTruthy();
  const movieResponse = await page.request.post('/api/admin/movies', {
    data: {
      title: `Filme E2E ${Date.now()}`,
      overview: 'Filme criado automaticamente para validar os fluxos principais.',
    },
    headers: { 'X-CSRF-Token': csrfCookie.value },
  });
  expect(movieResponse.ok()).toBeTruthy();
  const movie = await movieResponse.json();

  await page.goto(`/filme/local/${movie.id}`);
  await expect(page.getByRole('heading', { name: movie.title })).toBeVisible();

  await page.getByRole('button', { name: '+ Minha lista' }).click();
  await expect(page.getByRole('button', { name: '✓ Na lista' })).toBeVisible();
  await page.goto('/minha-lista');
  await expect(page.locator('.card-title', { hasText: movie.title })).toBeVisible();

  await page.goto(`/filme/local/${movie.id}`);
  await page.getByRole('button', { name: 'Marcar assistido' }).click();
  await expect(page.getByRole('button', { name: '✓ Assistido' })).toBeVisible();

  await page.getByRole('button', { name: 'Avaliar', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('.star-rating .star').last().click();
  await dialog.locator('textarea').fill('Uma avaliação criada pelo fluxo automatizado.');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.locator('.reviews-list')).toContainText('Uma avaliação criada pelo fluxo automatizado.');
  await page.goto('/assistidos');
  await expect(page.locator('.card-title', { hasText: movie.title })).toBeVisible();
});
