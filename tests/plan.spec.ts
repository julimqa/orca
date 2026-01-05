import { test, expect } from '@playwright/test';

async function apiLogin(page: any, email: string, password: string) {
  const res = await page.request.post('http://localhost:3001/api/auth/login', {
    data: { email, password },
  });
  const { accessToken } = await res.json();
  expect(accessToken).toBeTruthy();

  // 테스트 호환성을 위해 쿠키 + localStorage에 모두 저장
  await page.context().addCookies([
    {
      name: 'access_token',
      value: accessToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    },
  ]);
  await page.evaluate((token) => localStorage.setItem('accessToken', token), accessToken);
  return accessToken;
}

test('테스트 플랜 생성 및 조회 시나리오 (관리자 승인 포함)', async ({ page }) => {
  test.setTimeout(60000);

  const timestamp = Date.now();
  const userEmail = `plan_test_${timestamp}@example.com`;
  const userPassword = 'password123';
  const adminEmail = 'admin@tms.com';
  const adminPassword = 'admin123!';

  // 1. 회원가입
  await page.goto('/register');
  await page.getByTestId('auth-register-name').fill('Plan Tester');
  await page.getByTestId('auth-register-email').fill(userEmail);
  await page.getByTestId('auth-register-password').fill(userPassword);
  await page.getByTestId('auth-register-submit').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // 2. 관리자 승인 (API 로그인)
  const adminToken = await apiLogin(page, adminEmail, adminPassword);
  await page.request.patch('http://localhost:3001/api/admin/users/approve', {
    data: { email: userEmail, action: 'approve' },
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // 3. 사용자 로그인
  await page.goto('/login');
  await page.getByTestId('auth-login-email').fill(userEmail);
  await page.getByTestId('auth-login-password').fill(userPassword);
  await page.getByTestId('auth-login-submit').click();
  await expect(page).toHaveURL('/', { timeout: 10000 });

  // 사용자 토큰 확보 (API 로그인) -> 테스트케이스 준비에 사용
  const userToken = await apiLogin(page, userEmail, userPassword);

  // 4. 테스트케이스 2개 생성 (API)
  await page.request.post('http://localhost:3001/api/testcases', {
    data: { title: 'Login Test', priority: 'HIGH' },
    headers: { Authorization: `Bearer ${userToken}` },
  });
  await page.request.post('http://localhost:3001/api/testcases', {
    data: { title: 'Search Test', priority: 'MEDIUM' },
    headers: { Authorization: `Bearer ${userToken}` },
  });

  // 5. 플랜 생성 페이지 이동
  await page.goto('/plans');
  await page.getByText('플랜 생성').click();
  await expect(page).toHaveURL('/plans/create');

  // 6. 플랜 정보 입력
  await page.fill('input[placeholder*="예: 2024"]', `Integration Plan ${timestamp}`);
  await page.getByTestId('plan-create-select-all').click();
  await page.getByTestId('plan-create-submit').click();

  // 7. 목록 확인
  await expect(page).toHaveURL('/plans');
  await expect(page.getByText(`Integration Plan ${timestamp}`)).toBeVisible();
  const row = page.locator('tr', { hasText: `Integration Plan ${timestamp}` }).first();
  await expect(row.getByText('0%')).toBeVisible();

  // 8. 상세 진입
  await page.getByText(`Integration Plan ${timestamp}`).click();
  await expect(page).toHaveURL(/\/plans\//);
  await expect(page.getByText('Login Test').first()).toBeAttached();
  await expect(page.getByText('NOT RUN').first()).toBeAttached();
});
