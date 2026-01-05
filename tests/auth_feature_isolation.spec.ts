import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page).toHaveURL('/', { timeout: 10000 });
}

test.describe('Auth feature isolation (behavior lock)', () => {
  test('새로고침 후 로그인 상태 복원 동일', async ({ page }) => {
    await loginAs(page, 'test1@tms.com', 'test123!');

    // 대시보드 로딩 완료 신호(기존 UI 텍스트 그대로 사용)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 });

    await page.reload();

    // reload 후에도 보호 라우트에서 로그인 상태가 복원되어야 함
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 });
  });

  test('PrivateRoute: 미인증 사용자는 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/testcases');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  });

  test('RequireAdmin: 일반 사용자는 / 로 리다이렉트', async ({ page }) => {
    await loginAs(page, 'test1@tms.com', 'test123!');

    await page.goto('/admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 });
  });

  test('RequireAdmin: 관리자는 /admin 접근 가능', async ({ page }) => {
    await loginAs(page, 'admin@tms.com', 'admin123!');

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible({ timeout: 15000 });
  });
});


