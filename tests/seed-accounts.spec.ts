import { test, expect } from '@playwright/test';

test.describe('Seed 계정 테스트', () => {
  test('관리자 계정으로 로그인', async ({ page }) => {
    // 1. 로그인 페이지 이동
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // 2. 관리자 계정으로 로그인
    await page.getByLabel('이메일').fill('admin@tms.com');
    await page.getByLabel('비밀번호').fill('admin123!');
    await page.getByRole('button', { name: '로그인' }).click();

    // 3. 로그인 성공 확인 (홈으로 리다이렉트)
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    console.log('✅ 관리자 계정 로그인 성공');
  });

  test('테스트 계정 1로 로그인', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('이메일').fill('test1@tms.com');
    await page.getByLabel('비밀번호').fill('test123!');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    console.log('✅ 테스트 계정 1 로그인 성공');
  });

  test('테스트 계정 2로 로그인', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('이메일').fill('test2@tms.com');
    await page.getByLabel('비밀번호').fill('test123!');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    console.log('✅ 테스트 계정 2 로그인 성공');
  });

  test('테스트 계정 3으로 로그인', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('이메일').fill('test3@tms.com');
    await page.getByLabel('비밀번호').fill('test123!');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    console.log('✅ 테스트 계정 3 로그인 성공');
  });

  test('테스트 계정 4로 로그인', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('이메일').fill('test4@tms.com');
    await page.getByLabel('비밀번호').fill('test123!');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    console.log('✅ 테스트 계정 4 로그인 성공');
  });

  test('테스트 계정 5로 로그인', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('이메일').fill('test5@tms.com');
    await page.getByLabel('비밀번호').fill('test123!');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    console.log('✅ 테스트 계정 5 로그인 성공');
  });

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('이메일').fill('admin@tms.com');
    await page.getByLabel('비밀번호').fill('wrong-password');
    await page.getByRole('button', { name: '로그인' }).click();

    // 에러 메시지 또는 여전히 로그인 페이지에 있는지 확인
    await page.waitForTimeout(1000);
    
    // URL이 변하지 않았거나 에러 메시지가 표시되어야 함
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
    
    console.log('✅ 잘못된 비밀번호 로그인 방지 확인');
  });

  test('존재하지 않는 계정으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('이메일').fill('nonexistent@tms.com');
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
    
    console.log('✅ 존재하지 않는 계정 로그인 방지 확인');
  });
});

test.describe('관리자 권한 테스트', () => {
  test('관리자만 관리 페이지 접근 가능', async ({ page }) => {
    // 1. 관리자로 로그인
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@tms.com');
    await page.getByLabel('비밀번호').fill('admin123!');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // 2. 관리 페이지 접근 시도
    await page.goto('/admin');
    
    // 3. 접근 성공 확인 (403이나 리다이렉트가 아닌 실제 페이지)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');
    
    console.log('✅ 관리자 권한으로 관리 페이지 접근 성공');
  });

  test('일반 사용자는 관리 페이지 접근 불가', async ({ page }) => {
    // 1. 일반 사용자로 로그인
    await page.goto('/login');
    await page.getByLabel('이메일').fill('test1@tms.com');
    await page.getByLabel('비밀번호').fill('test123!');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // 2. 관리 페이지 접근 시도
    await page.goto('/admin');
    
    // 3. 접근 거부 확인 (리다이렉트 또는 403)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    
    // 관리 페이지가 아닌 다른 곳으로 리다이렉트되어야 함
    expect(currentUrl).not.toContain('/admin');
    
    console.log('✅ 일반 사용자 관리 페이지 접근 차단 확인');
  });
});

