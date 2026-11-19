import { test, expect } from '@playwright/test';
import { mockApi, login } from './helpers/apiFixtures.js';
const longTitle = 'Robert Pattinson discusses new projects and public appearances — https://example.com/' + 'extended-story-reference'.repeat(12);
async function noPageOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function fits(page, selector) {
  const overflow = await page.locator(selector).evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => ({ className: node.className, width: node.clientWidth, scroll: node.scrollWidth })));
  expect(overflow).toEqual([]);
}
for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`readable containers fit long content at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockApi(page);
    await page.route('**/api/v1/workspaces/w-1/monitors?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'm-1', name: 'Robert Pattinson and a very long monitored organisation name without truncation', query: 'Robert Pattinson', type: 'organisation', frequency: '20m', is_active: true }], meta: { total: 1, last_page: 1 } }) }));
    await page.route('**/api/v1/workspaces/w-1/intelligence/emerging', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [{ cluster_id: 'cluster-1', title: longTitle, velocity: 4962.875 }] }) }));
    await login(page);
    await expect(page.locator('.monitor-card')).toBeVisible();
    await noPageOverflow(page);
    await fits(page, '.monitor-card, .monitor-card-title, .monitor-card-stats, .monitor-card-stats > span, .pulse-card');
    const edges = await page.evaluate(() => ({ heading: document.querySelector('.dashboard-pulse-heading').getBoundingClientRect().left, section: document.querySelector('.dashboard-content > section').getBoundingClientRect().left }));
    expect(Math.abs(edges.heading - edges.section)).toBeLessThanOrEqual(1);
    await expect(page.locator('.monitor-card-title strong')).toHaveCSS('white-space', 'normal');
    expect(await page.locator('.monitor-card-title strong').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
    if (width <= 760) {
      const header = await page.locator('.dashboard-pulse-heading').evaluate(node => ({ paragraph: node.querySelector('p').getBoundingClientRect().bottom, action: node.querySelector('button').getBoundingClientRect().top }));
      expect(header.action - header.paragraph).toBeLessThanOrEqual(24);
    }
    await page.screenshot({ path: `/tmp/sentinel-dashboard-${width}.png`, fullPage: true });
    await page.goto('/intelligence');
    await expect(page.locator('.emerging-row > span')).toHaveText(longTitle);
    await noPageOverflow(page);
    await fits(page, '.intelligence-layout, .insight-card, .emerging-row, .emerging-row > span, .emerging-row > b');
    const rateFits = await page.locator('.emerging-row').evaluate(node => { const title = node.querySelector('span').getBoundingClientRect(), rate = node.querySelector('b').getBoundingClientRect(), row = node.getBoundingClientRect(); return rate.top >= title.bottom - 1 && rate.right <= row.right + 1; });
    expect(rateFits).toBe(true);
    expect(await page.locator('.emerging-row > span').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(15);
    await page.screenshot({ path: `/tmp/sentinel-intelligence-${width}.png`, fullPage: true });
    for (const [path, heading] of [['/analytics', 'Analytics'], ['/monitors', 'Monitors'], ['/alerts', 'Alerts'], ['/settings', 'Settings'], ['/search?q=Robert', 'Search collected mentions']]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await noPageOverflow(page);
    }
  });
}

test('mobile sign-in controls stay readable and fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await mockApi(page);
  await page.goto('/signin');
  await expect(page.getByLabel('Work email')).toBeVisible();
  await noPageOverflow(page);
  await fits(page, '.auth-form-wrap, .input-shell, .social-buttons');
  expect(await page.getByLabel('Work email').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
});
