import { test, expect } from '@playwright/test';

test.describe('Phase 0.2 Smoke', () => {
  test('backend health check returns expected shape', async ({ request }) => {
    const res = await request.get('http://localhost:3001/health');
    expect(res.ok()).toBeTruthy();

    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      message: 'TMS Backend Server is running',
    });
    expect(typeof json.timestamp).toBe('string');
  });

  test('frontend boots and redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    // 최소한의 "부팅 성공" 신호: 로그인 화면 핵심 요소 존재
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });
});
