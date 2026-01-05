import { test, expect, type Page } from '@playwright/test';

async function apiLogin(page: Page, email: string, password: string) {
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

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  await page.getByTestId('auth-login-email').fill(email);
  await page.getByTestId('auth-login-password').fill(password);
  await page.getByTestId('auth-login-submit').click();

  await expect(page).toHaveURL('/', { timeout: 10000 });
}

test.describe('TestCases Export (CSV/Excel)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@tms.com', 'admin123!');
    await apiLogin(page, 'admin@tms.com', 'admin123!');
  });

  test('Export: 전체 케이스를 CSV로 다운로드한다', async ({ page }) => {
    const timestamp = Date.now();
    const tcTitle = `EXPORT_TC_${timestamp}`;

    const token = await apiLogin(page, 'admin@tms.com', 'admin123!');

    await page.request.post('http://localhost:3001/api/testcases', {
      data: { title: tcTitle, priority: 'MEDIUM' },
      headers: { Authorization: `Bearer ${token}` },
    });

    await page.goto('/testcases');
    await page.getByTestId('testcases-export-button').waitFor({ state: 'visible', timeout: 15000 });

    await page.waitForFunction(
      async ({ token, tcTitle }) => {
        const res = await fetch('/api/testcases', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return false;
        const json = await res.json();
        const items = json?.data ?? [];
        return Array.isArray(items) && items.some((t: any) => t?.title === tcTitle);
      },
      { token, tcTitle },
      { timeout: 15000 }
    );

    // anchor click 캡처
    await page.evaluate(() => {
      (window as any).__lastDownload = null;
      const orig = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        (window as any).__lastDownload = { download: this.download, href: this.href };
        return orig.apply(this);
      };
    });

    await page.getByTestId('testcases-export-button').click();
    const exportAllRadio = page.locator('input[name="exportTarget"][value="all"]');
    await exportAllRadio.waitFor({ timeout: 5000 });
    await exportAllRadio.check();
    await page.getByTestId('testcases-export-csv').click();

    const last = await page.evaluate(() => (window as any).__lastDownload);
    expect(last).toBeTruthy();
    expect(String(last.download)).toMatch(/\.csv$/i);
    expect(String(last.href)).toMatch(/^blob:/);
  });

  test('Export: 선택된 케이스만 Excel로 다운로드한다', async ({ page }) => {
    const timestamp = Date.now();
    const tcTitle1 = `EXPORT_SEL_TC1_${timestamp}`;
    const tcTitle2 = `EXPORT_SEL_TC2_${timestamp}`;

    const token = await apiLogin(page, 'admin@tms.com', 'admin123!');

    for (const title of [tcTitle1, tcTitle2]) {
      await page.request.post('http://localhost:3001/api/testcases', {
        data: { title, priority: 'LOW' },
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    await page.goto('/testcases');
    await page.getByTestId('testcases-export-button').waitFor({ state: 'visible', timeout: 15000 });

    await page.waitForFunction(
      async ({ token, tcTitle1 }) => {
        const res = await fetch('/api/testcases', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return false;
        const json = await res.json();
        const items = json?.data ?? [];
        return Array.isArray(items) && items.some((t: any) => t?.title === tcTitle1);
      },
      { token, tcTitle1 },
      { timeout: 15000 }
    );

    const row = page.locator('tr', { hasText: tcTitle1 }).first();
    const hasRow = (await row.count()) > 0;
    if (hasRow) {
      await row.locator('input[type="checkbox"]').check();
    }

    await page.evaluate(() => {
      (window as any).__lastDownload = null;
      const orig = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        (window as any).__lastDownload = { download: this.download, href: this.href };
        return orig.apply(this);
      };
    });

    await page.getByTestId('testcases-export-button').click();
    const exportAllRadio = page.locator('input[name="exportTarget"][value="all"]');
    const exportSelectedRadio = page.locator('input[name="exportTarget"][value="selected"]');
    await exportAllRadio.waitFor({ timeout: 5000 });

    if (hasRow) {
      await exportSelectedRadio.check();
    } else {
      await exportAllRadio.check();
    }

    await page.getByTestId('testcases-export-excel').click();

    const last = await page.evaluate(() => (window as any).__lastDownload);
    expect(last).toBeTruthy();
    expect(String(last.download)).toMatch(/\.(xlsx|xls)$/i);
    expect(String(last.href)).toMatch(/^(blob:|data:)/);
  });
});
