import {test,expect} from '@playwright/test';
import {mockApi} from './helpers/apiFixtures.js';
import {startProduction} from './helpers/productionServer.js';
for(const width of [1920,2560,3840])test(`wide workspace pages keep 16–24px gutters at ${width}px`,async({page})=>{
  test.setTimeout(90000);
  const production=await startProduction('http://127.0.0.1:1');
  try{
    await page.setViewportSize({width,height:1100});await page.emulateMedia({reducedMotion:'reduce'});
    await mockApi(page);
    await page.addInitScript(()=>localStorage.setItem('sentinel_session',JSON.stringify({token:'test-session-token'})));
    for(const path of ['/','/intelligence','/analytics','/monitors','/alerts','/settings','/settings?section=team','/monitors/m-1','/search?q=network']){
      await page.goto(production.url+path);
      await expect(page.locator(path==='/'?'.dashboard-content':'.research-heading')).toBeVisible();
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      const edges=await page.evaluate(home=>{
        const main=document.querySelector('.workspace-main').getBoundingClientRect();
        const content=document.querySelector(home?'.dashboard-content > section':'.research-heading').getBoundingClientRect();
        const header=document.querySelector('.header-status').getBoundingClientRect();
        return {left:content.left-main.left,right:main.right-content.right,header:header.left-main.left};
      },path==='/');
      for(const gutter of [edges.left,edges.right,edges.header]){expect(gutter).toBeGreaterThanOrEqual(15);expect(gutter).toBeLessThanOrEqual(25);}
      expect(Math.abs(edges.left-edges.header)).toBeLessThanOrEqual(1);
      if(path==='/intelligence'||path==='/analytics')await page.screenshot({path:`/tmp/sentinel-compact-${path.slice(1)}-${width}.png`,fullPage:true});
    }
  }finally{await production.close();}
});
for(const width of [320,768,1920])test(`public page spacing and reading widths fit ${width}px`,async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width,height:900});await mockApi(page);
  for(const path of ['/','/privacy','/terms','/signin','/signup','/forgot-password','/verify-email','/reset-password']){
    await page.goto(path);
    await expect(page.locator('h1,h2').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    if(path==='/'){
      const padding=await page.locator('.landing-header').evaluate(node=>parseFloat(getComputedStyle(node).paddingLeft));
      expect(padding).toBeGreaterThanOrEqual(16);expect(padding).toBeLessThanOrEqual(24);
    }
    if(path==='/privacy'||path==='/terms')expect((await page.locator('.legal-shell').boundingBox()).width).toBeLessThanOrEqual(780);
    if(path==='/signin')expect((await page.locator('.auth-form-wrap').boundingBox()).width).toBeLessThanOrEqual(420);
  }
});
