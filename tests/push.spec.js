import { test, expect } from '@playwright/test';
import { mockApi, login } from './helpers/apiFixtures.js';
import { mockPushBrowser } from './helpers/pushBrowser.js';
async function openSettings(page, browserOptions = {}, apiOptions = {}) {
  await mockPushBrowser(page,browserOptions);
  const calls = await mockApi(page,apiOptions);
  await login(page);
  await page.goto('/settings?section=notifications');
  await expect(page.getByRole('button',{name:'Enable on this device'})).toBeVisible();
  return calls;
}
test('enabling push uses root API endpoints, registers once, persists and disables just this device', async ({ page }) => {
  const calls = await openSettings(page);
  expect(await page.evaluate(()=>window.pushTest.permissionRequests)).toBe(0);
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('status').filter({hasText:'Browser notifications enabled'})).toBeVisible();
  const post = calls.find(c=>c.path==='/push/subscriptions' && c.method==='POST');
  expect(post.body).toEqual({endpoint:'https://push.example/current',p256dh:'browser-public-key',auth:'browser-auth-key',device_name:'Sentinel web browser'});
  expect(post.headers.authorization).toBe('Bearer test-session-token');
  expect(calls.some(c=>c.path==='/workspaces/w-1/settings/notifications' && c.body?.channel_web_push===true)).toBe(true);
  expect(calls.some(c=>c.path.includes('/workspaces/w-1/push'))).toBe(false);
  await page.reload();
  await expect(page.getByRole('button',{name:'Disable on this device'})).toBeVisible();
  expect(calls.filter(c=>c.path==='/push/subscriptions'&&c.method==='POST')).toHaveLength(1);
  await page.getByRole('button',{name:'Disable on this device'}).click();
  await expect(page.getByRole('status').filter({hasText:'Notifications stopped on this device.'})).toBeVisible();
  expect(calls.some(c=>c.path==='/push/subscriptions/push-1'&&c.method==='DELETE')).toBe(true);
  expect(calls.some(c=>c.body?.channel_web_push===false)).toBe(false);
  expect(await page.evaluate(()=>localStorage.getItem('test_push_endpoint'))).toBeNull();
});
test('blocked permission does not subscribe or send a registration',async({page})=>{
  const calls=await openSettings(page,{denied:true});
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('alert')).toContainText('Notifications are blocked');
  expect(calls.some(c=>c.path.startsWith('/push/'))).toBe(false);
  expect(await page.evaluate(()=>window.pushTest.subscriptions)).toBe(0);
});
test('unsupported browsers have an explanation and no permission prompt',async({page})=>{
  await openSettings(page,{unsupported:true});
  await expect(page.getByRole('button',{name:'Enable on this device'})).toBeDisabled();
  await expect(page.getByText(/Use a supported browser on HTTPS or localhost/)).toBeVisible();
});
test('failed registration unsubscribes the browser and allows retry',async({page})=>{
  const calls=await openSettings(page,{}, {pushError:true});
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('alert')).toHaveText('We couldn’t complete that request. Please try again.');
  expect(await page.evaluate(()=>localStorage.getItem('test_push_endpoint'))).toBeNull();
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('button',{name:'Disable on this device'})).toBeVisible();
  expect(calls.filter(c=>c.path==='/push/subscriptions'&&c.method==='POST')).toHaveLength(2);
});
test('failed preference save retries without duplicate device registration',async({page})=>{
  const calls=await openSettings(page,{}, {pushPreferenceError:true});
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('button',{name:'Disable on this device'})).toBeVisible();
  expect(calls.filter(c=>c.path==='/push/subscriptions'&&c.method==='POST')).toHaveLength(1);
});
test('invalid server key is handled without subscribing',async({page})=>{
  const calls=await openSettings(page,{}, {invalidPushKey:true});
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('alert')).toHaveText('Notifications aren’t available right now. Please try again later.');
  expect(calls.some(c=>c.path==='/push/subscriptions'&&c.method==='POST')).toBe(false);
});
test('a previous account subscription is replaced and sign-out removes local delivery',async({page})=>{
  await openSettings(page,{foreign:true});
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('button',{name:'Disable on this device'})).toBeVisible();
  expect(await page.evaluate(()=>window.pushTest.unsubscriptions)).toBe(1);
  expect(await page.evaluate(()=>localStorage.getItem('sentinel_push_owner'))).toBe('u-1');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('test_push_endpoint'))).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('sentinel_session'))).toBeNull();
});

test('malformed registration success never enables delivery or leaves the browser subscribed',async({page})=>{
  const calls=await openSettings(page,{}, {pushMalformed:true});
  await page.getByRole('button',{name:'Enable on this device'}).click();
  await expect(page.getByRole('alert')).toHaveText('We couldn’t confirm this device’s registration. Please try again.');
  expect(await page.evaluate(()=>localStorage.getItem('test_push_endpoint'))).toBeNull();
  expect(calls.some(c=>c.body?.channel_web_push===true)).toBe(false);
});
