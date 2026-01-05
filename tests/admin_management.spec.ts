import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page).toHaveURL('/', { timeout: 10000 });
}

test.describe('Admin: user management', () => {
  test('관리자는 신규 사용자 승인(API) 후 Admin UI에서 비밀번호 초기화 → 신규 비밀번호로 로그인 가능', async ({ page, request }) => {
    test.setTimeout(60000);

    const timestamp = Date.now();
    const email = `e2e_admin_user_${timestamp}@example.com`;
    const initialPassword = 'password123!';
    const resetPassword = `reset_${timestamp}`;

    // 1) 신규 사용자 생성 (PENDING)
    const reg = await request.post('http://localhost:3001/api/auth/register', {
      data: { name: 'E2E User', email, password: initialPassword },
    });
    expect(reg.ok()).toBeTruthy();

    // 2) 관리자 로그인(API) → 승인 처리
    const adminLogin = await request.post('http://localhost:3001/api/auth/login', {
      data: { email: 'admin@tms.com', password: 'admin123!' },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminJson = await adminLogin.json();
    const token = adminJson?.accessToken as string | undefined;
    expect(typeof token).toBe('string');

    const approve = await request.patch('http://localhost:3001/api/admin/users/approve', {
      headers: { Authorization: `Bearer ${token}` },
      data: { email, action: 'approve' },
    });
    expect(approve.ok()).toBeTruthy();

    // 3) Admin UI에서 사용자 확인 + 비밀번호 초기화
    await loginAs(page, 'admin@tms.com', 'admin123!');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible({ timeout: 15000 });

    const userRow = page.locator('tr', { hasText: email }).first();
    await expect(userRow).toBeVisible();

    await userRow.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByText('비밀번호 초기화')).toBeVisible();
    await page.getByLabel('새 비밀번호').fill(resetPassword);
    await page.getByRole('button', { name: '초기화' }).click();

    // 4) 신규 사용자로 로그인 가능해야 함
    // Navbar는 "Logout", Sidebar는 title="Sign out" 버튼을 사용
    const navbarLogout = page.getByRole('button', { name: 'Logout', exact: true });
    if (await navbarLogout.count()) {
      await navbarLogout.click();
    } else {
      await page.getByTitle('Sign out').click();
    }
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    await loginAs(page, email, resetPassword);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 });
  });

  test('관리자는 /admin 페이지에 접근 가능', async ({ page }) => {
    await loginAs(page, 'admin@tms.com', 'admin123!');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible({ timeout: 15000 });
  });
});


