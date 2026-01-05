import { test, expect } from '@playwright/test';

async function apiLogin(page: any, email: string, password: string) {
  const res = await page.request.post('http://localhost:3001/api/auth/login', {
    data: { email, password },
  });
  const { accessToken } = await res.json();
  expect(accessToken).toBeTruthy();

  await page.context().addCookies([
    { name: 'access_token', value: accessToken, domain: 'localhost', path: '/', httpOnly: true },
  ]);
  await page.evaluate((token) => localStorage.setItem('accessToken', token), accessToken);
  return accessToken;
}

test('Plan Execution: Result update, Comment, and Bulk update', async ({ page }) => {
  test.setTimeout(60000);

  const timestamp = Date.now();
  const adminEmail = 'admin@tms.com';
  const adminPassword = 'admin123!';

  const tcTitle1 = `TC_001_Login_${timestamp}`;
  const tcTitle2 = `TC_002_Search_${timestamp}`;
  const tcTitle3 = `TC_003_Checkout_${timestamp}`;

  // 관리자 로그인 (UI) + 토큰 확보
  await page.goto('/login');
  await page.getByTestId('auth-login-email').fill(adminEmail);
  await page.getByTestId('auth-login-password').fill(adminPassword);
  await page.getByTestId('auth-login-submit').click();
  await expect(page).toHaveURL('/', { timeout: 10000 });

  const adminToken = await apiLogin(page, adminEmail, adminPassword);

  // 테스트케이스 3개 생성 (API)
  for (const [title, priority] of [
    [tcTitle1, 'HIGH'],
    [tcTitle2, 'MEDIUM'],
    [tcTitle3, 'LOW'],
  ] as const) {
    await page.request.post('http://localhost:3001/api/testcases', {
      data: { title, priority },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  // 플랜 생성
  await page.goto('/plans');
  await expect(page.getByRole('heading', { name: '테스트 플랜' })).toBeVisible();

  await page.getByText('플랜 생성').click();
  await page.fill('input[placeholder*="예: 2024"]', `Execution Plan ${timestamp}`);
  await page.getByTestId('plan-create-search').fill(timestamp.toString());
  await page.waitForTimeout(300);
  await page.getByTestId('plan-create-select-all').click();
  await page.getByTestId('plan-create-submit').click();

  // 상세 페이지 진입
  await expect(page).toHaveURL('/plans');
  await page.getByText(`Execution Plan ${timestamp}`).click();
  await expect(page).toHaveURL(/\/plans\//);
  await expect(page.getByText(tcTitle1)).toHaveCount(1);
  await expect(page.getByText('0%').first()).toBeVisible();

  // TC1 -> PASS
  const row1 = page.locator('tr', { hasText: tcTitle1 }).first();
  const resultTriggerBefore = row1.getByRole('button', { name: /NOT RUN/i }).first();
  await resultTriggerBefore.click();
  const dropdown = page.locator('div.absolute.z-50').last();
  await dropdown.getByRole('button', { name: 'PASS' }).click();
  const resultTriggerAfter = row1.getByRole('button', { name: /PASS/i }).first();
  await expect(resultTriggerAfter).toBeVisible({ timeout: 15000 });
  await expect(resultTriggerAfter).toHaveClass(/bg-emerald-500/, { timeout: 15000 });
  await expect(page.getByText('33%').first()).toBeVisible();

  // 코멘트 추가
  await row1.click();
  const commentText = 'Tested on https://example.com';
  const commentArea = page.locator('textarea[placeholder*="Add notes"]');
  await commentArea.fill(commentText);
  await commentArea.blur();
  await expect(row1.locator('svg.lucide-message-square')).toBeVisible();

  // Bulk update (FAIL)
  const row2 = page.locator('tr', { hasText: tcTitle2 }).first();
  const row3 = page.locator('tr', { hasText: tcTitle3 }).first();
  await row2.locator('input[type="checkbox"]').check();
  await row3.locator('input[type="checkbox"]').check();
  await expect(page.getByText('2개 선택')).toBeVisible();
  await page.getByTestId('plan-bulk-result').selectOption('FAIL');
  await page.getByTestId('plan-bulk-apply').click();
  await page.waitForTimeout(1000);

  await expect(row2.getByRole('button', { name: /FAIL/i }).first()).toBeVisible();
  await expect(row3.getByRole('button', { name: /FAIL/i }).first()).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();
});
