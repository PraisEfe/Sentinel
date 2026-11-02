import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/apiFixtures.js';
const session = { token: 'test-session-token', user: { id: 'u-1', name: 'Ada Okafor', email: 'ada@example.com' } };
async function exchange(page, response = session, status = 200) {
  const calls = [];
  await page.route('**/api/v1/auth/social/exchange', async route => {
    calls.push({ body: route.request().postDataJSON(), method: route.request().method(), authorization: route.request().headers().authorization });
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
  });
  return calls;
}
for (const provider of ['google', 'microsoft']) for (const remember of [true, false]) {
  test(`${provider} redirects in the same tab and restores ${remember ? 'persistent' : 'temporary'} session`, async ({ page }) => {
    await mockApi(page);
    const exchanges = await exchange(page);
    let redirect;
    await page.route(`**/api/v1/auth/social/${provider}/redirect?*`, route => {
      redirect = new URL(route.request().url());
      return route.fulfill({ status: 302, headers: { location: `/auth/callback?code=test-once&provider=${provider}` }, body: '' });
    });
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/signin$/);
    if (!remember) await page.getByLabel('Keep me signed in on this device').uncheck();
    const button = page.getByRole('button', { name: provider === 'google' ? 'Google' : 'Microsoft', exact: true });
    await expect(button.locator('img')).toHaveAttribute('src', `/${provider}.svg`);
    await button.click();
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible({ timeout: 15000 });
    expect(redirect.pathname).toBe(`/api/v1/auth/social/${provider}/redirect`);
    expect(redirect.origin).toBe(new URL(page.url()).origin);
    expect(redirect.searchParams.get('device_name')).toBe('web');
    expect(redirect.searchParams.get('remember')).toBe(remember ? '1' : '0');
    expect(exchanges).toEqual([{ body: { code: 'test-once' }, method: 'POST', authorization: undefined }]);
    const storage = await page.evaluate(() => ({ persistent: !!localStorage.getItem('sentinel_session'), temporary: !!sessionStorage.getItem('sentinel_session'), remember: sessionStorage.getItem('sentinel_social_remember'), destination: sessionStorage.getItem('sentinel_social_return_to') }));
    expect(storage).toEqual({ persistent: remember, temporary: !remember, remember: null, destination: null });
    expect(page.url()).not.toContain('test-once');
    expect(page.url()).not.toContain(session.token);
    expect(page.context().pages()).toHaveLength(1);
  });
}

test('callback is public, scrubs code while pending and exchanges once under StrictMode', async ({ page }) => {
  await mockApi(page);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let attempts = 0;
  await page.route('**/api/v1/auth/social/exchange', async route => {
    attempts++;
    await pending;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(session) });
  });
  await page.goto('/auth/callback?code=sensitive-once&provider=google');
  await expect(page.getByRole('heading', { name: 'Completing sign-in…' })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await expect.poll(() => attempts).toBe(1);
  release();
  await expect(page.getByRole('heading', { name: 'Discover what’s happening online.' })).toBeVisible();
  expect(attempts).toBe(1);
  await page.goBack();
  expect(page.url()).not.toContain('sensitive-once');
});

test('social callback sends new accounts to existing workspace onboarding', async ({ page }) => {
  await mockApi(page, { noWorkspace: true });
  await exchange(page);
  await page.goto('/auth/callback?code=valid&provider=microsoft');
  await expect(page).toHaveURL(/\/workspaces\/new$/);
  await expect(page.getByRole('heading', { name: /Create your research workspace/ })).toBeVisible();
});

for (const [reason, message] of [['access_denied', 'Sign-in was cancelled.'], ['invalid_state', 'This sign-in link expired. Please try again.'], ['email_unverified', 'Your provider email is not verified.'], ['email_missing', 'Your provider did not share an email address.'], ['account_disabled', 'This account is disabled.'], ['account_unavailable', 'This account is not available.'], ['social_login_failed', 'Sign-in could not be completed. Please try again.'], ['constructor', 'Sign-in could not be completed. Please try again.'], ['<script>internal detail</script>', 'Sign-in could not be completed. Please try again.']]) {
  test(`callback error ${reason} is readable and never exchanges a code`, async ({ page }) => {
    await mockApi(page);
    const calls = await exchange(page);
    await page.goto(`/auth/callback?${new URLSearchParams({ error: reason, provider: 'google', code: 'ignored' })}`);
    await expect(page.getByRole('alert')).toHaveText(message);
    await expect(page).toHaveURL(/\/auth\/callback$/);
    expect(calls).toHaveLength(0);
    await page.getByRole('link', { name: 'Back to sign in' }).click();
    await expect(page).toHaveURL(/\/signin$/);
  });
}
for (const [label, body, status] of [['expired', { message: 'Internal exception' }, 422], ['server failure', { message: 'SQLSTATE secret' }, 500], ['malformed session', { token: 'unusable' }, 200]]) {
  test(`exchange ${label} stays recoverable without storing a session`, async ({ page }) => {
    await mockApi(page);
    const calls = await exchange(page, body, status);
    await page.goto('/auth/callback?code=bad&provider=google');
    await expect(page.getByRole('alert')).toHaveText(status === 422 ? 'This sign-in link expired or has already been used. Please try again.' : 'Sign-in could not be completed. Please try again.');
    expect(calls).toHaveLength(1);
    expect(await page.evaluate(() => localStorage.getItem('sentinel_session') || sessionStorage.getItem('sentinel_session'))).toBeNull();
    await page.getByRole('link', { name: 'Back to sign in' }).click();
    await expect(page).toHaveURL(/\/signin$/);
  });
}
for (const query of ['', '?provider=google', '?code=valid&provider=unknown']) {
  test(`incomplete callback ${query} fails without exchange`, async ({ page }) => {
    await mockApi(page);
    const calls = await exchange(page);
    await page.goto(`/auth/callback${query}`);
    await expect(page.getByRole('alert')).toBeVisible();
    expect(calls).toHaveLength(0);
  });
}
for (const destination of ['https://evil.example', '//evil.example', '/\\evil.example', '/auth/callback?code=loop']) {
  test(`unsafe social return destination ${destination} falls back to dashboard`, async ({ page }) => {
    await mockApi(page);
    await exchange(page);
    await page.addInitScript(value => sessionStorage.setItem('sentinel_social_return_to', value), destination);
    await page.goto('/auth/callback?code=valid&provider=google');
    await expect(page.getByRole('heading', { name: 'Discover what’s happening online.' })).toBeVisible();
    await expect(page).toHaveURL(/:\d+\/$/);
  });
}
