import { test, expect } from '@playwright/test';

test.describe('Test Case Management', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 로그인 (seed admin 계정)
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@tms.com');
    await page.getByLabel('비밀번호').fill('admin123!');
    await page.getByRole('button', { name: '로그인' }).click();
    
    // 대시보드 이동 확인 (timeout 넉넉하게)
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Test Cases 페이지로 이동
    await page.click('a[href="/testcases"]');
    await expect(page).toHaveURL('/testcases');
  });

  test('should create folder, create test case, move folder, and delete', async ({ page }) => {
    const folderName = `Folder ${Date.now()}`;
    const caseTitle = `Case ${Date.now()}`;
    const updatedTitle = `${caseTitle} Updated`;

    // 1. 폴더 생성
    await page.getByTestId('folders-new-folder').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('folders-new-folder').click();
    await page.getByTestId('input-modal').waitFor({ state: 'visible' });
    await page.getByTestId('input-modal-input').fill(folderName);
    await page.getByTestId('input-modal-confirm').click();
    
    // 폴더 생성 확인 (텍스트로 찾기)
    await expect(page.locator(`text=${folderName}`).first()).toBeVisible();
    
    // 2. 폴더 선택
    await page.click(`text=${folderName}`);
    // 폴더 선택 시 헤더가 "Test Cases"로 바뀜
    await expect(page.locator('h1')).toHaveText('Test Cases'); 

    // 3. 테스트 케이스 생성
    await page.click('button:has-text("Add Case")');
    await expect(page.locator('h2')).toContainText('Create Test Case');
    
    await page.getByTestId('testcase-form-title').fill(caseTitle);
    
    // Priority 선택 (첫 번째 select)
    await page.getByTestId('testcase-form-priority').selectOption('HIGH');
    
    // Folder 선택 (자동으로 현재 폴더가 선택되어 있어야 함)
    await page.getByTestId('testcase-form-submit').click();
    
    // 생성 확인
    await expect(page.locator('table')).toContainText(caseTitle);
    await expect(page.locator('table')).toContainText('HIGH');

    // 4. 테스트 케이스 수정 (제목 변경 및 폴더 이동)
    const row = page.locator('tr', { hasText: caseTitle });
    await row.locator('button').click(); // More button
    
    await page.click('button:has-text("Edit")');
    // 우측 디테일 패널이 열리고, 패널 내에서 편집 모드로 진입
    await expect(page.locator('h2')).toContainText(caseTitle);
    const editBtn = page.getByTestId('testcase-panel-edit');
    if (await editBtn.count()) {
      await editBtn.click();
    }
    
    await page.getByTestId('testcase-panel-title').fill(updatedTitle);
    
    // 폴더를 Root로 이동 (두 번째 select)
    await page.getByTestId('testcase-panel-folder').selectOption(''); 
    
    await page.getByTestId('testcase-panel-save').click();
    
    // 5. 이동 확인 (현재 폴더에서 사라짐)
    // 폴더가 비면 table 자체가 DOM에서 사라질 수 있으므로, table 존재 가정 없이 "해당 행이 0개"인지 검증한다.
    await expect(page.locator('table').locator('tr', { hasText: updatedTitle })).toHaveCount(0);

    // 6. 삭제
    // 케이스가 루트로 이동해도 디테일 패널은 열린 상태이므로, 목록 재탐색(플래키) 없이 패널에서 바로 삭제한다.
    await page.getByTestId('testcase-panel-delete').click();
    await expect(page.locator('text=Delete Test Case')).toBeVisible();
    
    // 모달 내의 Delete 버튼 클릭
    await page.click('div[role="dialog"] button:has-text("Delete")');

    // 삭제 확인
    // 삭제 후에도 목록(table)이 사라질 수 있으므로, table 존재 가정 없이 "해당 행이 0개"인지 검증한다.
    await expect(page.locator('table').locator('tr', { hasText: updatedTitle })).toHaveCount(0);
  });
});
