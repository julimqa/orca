import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page).toHaveURL('/', { timeout: 10000 });
}

test.describe('Settings (profile / password)', () => {
  test('미인증 사용자는 /settings 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  });

  test('프로필 이름 변경 후 저장되며, 원복도 가능하다', async ({ page }) => {
    await loginAs(page, 'test1@tms.com', 'test123!');

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 15000 });

    const nameInput = page.getByLabel('Name');
    const originalName = await nameInput.inputValue();
    const updatedName = `E2E Name ${Date.now()}`;

    await nameInput.fill(updatedName);
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByText('프로필이 업데이트되었습니다.')).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Name')).toHaveValue(updatedName);

    // 원복 (다른 테스트에 영향 최소화)
    await page.getByLabel('Name').fill(originalName);
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByText('프로필이 업데이트되었습니다.')).toBeVisible({ timeout: 15000 });
  });

  test('비밀번호 변경: 새 비밀번호 불일치 시 에러가 표시된다(상태 변경 없음)', async ({ page }) => {
    await loginAs(page, 'test1@tms.com', 'test123!');

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Current Password').fill('test123!');
    await page.getByLabel('New Password', { exact: true }).fill('newpassword1');
    await page.getByLabel('Confirm New Password', { exact: true }).fill('newpassword2');
    await page.getByRole('button', { name: 'Change Password' }).click();

    await expect(page.getByText('새 비밀번호가 일치하지 않습니다.')).toBeVisible();
  });
});


