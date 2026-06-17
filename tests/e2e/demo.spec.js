import { expect, test } from '@playwright/test';

function readNumber(text) {
  const value = Number.parseInt(String(text).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(value) ? 0 : value;
}

test.describe('HighGrid demo smoke', () => {
  test('renders the main demo and responds to common remote actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'HighGrid Demo' })).toBeVisible();
    await expect(page.locator('#grid-overview .ck-high-grid-row').first()).toBeVisible();

    await page.getByRole('button', { name: 'Live & Performance' }).click();
    await expect(page.locator('#grid-live .ck-high-grid-row').first()).toBeVisible();

    const rowCount = page.locator('#rowCount');
    const before = readNumber(await rowCount.textContent());

    await page.getByRole('button', { name: '행 5개 추가' }).click();
    await expect.poll(async () => readNumber(await rowCount.textContent())).toBeGreaterThan(before);

    await page.getByRole('button', { name: '렌더링 측정' }).click();
    await expect(page.locator('#benchmarkLog')).not.toContainText('아직 벤치마크 실행 없음.');

    await page.getByRole('button', { name: 'Hierarchy & Grouping' }).click();
    await page.getByRole('button', { name: '가변 행 높이' }).click();
    await expect(page.locator('#variableHeightValue')).toContainText(/on|off/i);
  });

  test('keeps the floating controls keyboard-reachable and labeled', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Live & Performance' }).click();
    await expect(page.locator('#grid-live .ck-high-grid-row').first()).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    const unlabeledControls = await page.locator('.control-grid input, .control-grid select, .control-grid button, .control-grid textarea').evaluateAll((elements) => {
      const hasAccessibleName = (element) => {
        const label = element.getAttribute('aria-label')
          || element.getAttribute('aria-labelledby')
          || element.getAttribute('title')
          || element.textContent;

        if (label && String(label).trim()) {
          return true;
        }

        if (element.id) {
          const explicit = document.querySelector(`label[for="${element.id}"]`);
          if (explicit?.textContent?.trim()) {
            return true;
          }
        }

        const wrapper = element.closest('label');
        return Boolean(wrapper?.textContent?.trim());
      };

      return elements
        .filter((element) => !hasAccessibleName(element))
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id,
          type: element.getAttribute('type'),
        }));
    });

    expect(unlabeledControls).toEqual([]);

    await page.getByRole('button', { name: '실시간 스트림 시작' }).focus();
    await expect(page.getByRole('button', { name: '실시간 스트림 시작' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: '스트림 중지' })).toBeFocused();
  });
});
