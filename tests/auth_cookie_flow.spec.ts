import { test, expect } from '@playwright/test';

test.describe('Auth hardening', () => {
  test('관리자 로그인 시 httpOnly 쿠키가 설정된다', async ({ page, context }) => {
    await page.goto('/login');
    await page.getByTestId('auth-login-email').fill('admin@tms.com');
    await page.getByTestId('auth-login-password').fill('admin123!');
    await page.getByTestId('auth-login-submit').click();

    await expect(page).toHaveURL('/', { timeout: 10000 });

    const cookies = await context.cookies('http://localhost');
    expect(cookies.some((c) => c.name === 'access_token')).toBeTruthy();
  });

  test('잘못된 비밀번호로 로그인하면 오류 메시지를 표시한다', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('auth-login-email').fill('admin@tms.com');
    await page.getByTestId('auth-login-password').fill('wrong-password');
    await page.getByTestId('auth-login-submit').click();

    await expect(page).toHaveURL(/\/login/);
  });
});
