import { test, expect } from '@playwright/test';

test('회원가입 후 관리자 승인 -> 신규 사용자 로그인', async ({ page }) => {
  // 1) 회원가입
  await page.goto('/register');
  const timestamp = Date.now();
  const email = `test${timestamp}@example.com`;
  const password = 'password123';
  const name = 'Test User';

  await page.getByTestId('auth-register-name').fill(name);
  await page.getByTestId('auth-register-email').fill(email);
  await page.getByTestId('auth-register-password').fill(password);
  await page.getByTestId('auth-register-submit').click();

  // 가입 후 로그인 페이지 이동 확인
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // 2) 관리자 로그인 + 승인(API)
  const adminLogin = await page.request.post('http://localhost:3001/api/auth/login', {
    data: { email: 'admin@tms.com', password: 'admin123!' },
  });
  const { accessToken: adminToken } = await adminLogin.json();
  expect(adminToken).toBeTruthy();

  const approveRes = await page.request.patch('http://localhost:3001/api/admin/users/approve', {
    data: { email, action: 'approve' },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(approveRes.ok()).toBeTruthy();

  // 3) 신규 사용자 로그인
  await page.goto('/login');
  await page.getByTestId('auth-login-email').fill(email);
  await page.getByTestId('auth-login-password').fill(password);
  await page.getByTestId('auth-login-submit').click();

  await expect(page).toHaveURL('/', { timeout: 10000 });
});
