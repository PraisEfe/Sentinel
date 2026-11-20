import {test,expect} from '@playwright/test';
import {mockApi} from './helpers/apiFixtures.js';
import {startProduction} from './helpers/productionServer.js';
for (const width of [320,768,1440]) test(`production analytics chart fills its card at ${width}px`,async({page})=>{
  test.setTimeout(60000);
  const production=await startProduction('http://127.0.0.1:1');
  try{
    await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
    await mockApi(page);
    await page.route('**/api/v1/workspaces/w-1/analytics/sources?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({sources:Array.from({length:20},(_,i)=>({name:i===19?'Federal Ministry of Information and National Orientation':`Public source ${i+1}`,count:i?1:2000,share:i?0.01:0.54}))})}));
    await page.route('**/api/v1/workspaces/w-1/analytics/volume?*',route=>{
      if(new URL(route.request().url()).searchParams.get('period')!=='7d')return route.fallback();
      return route.fulfill({contentType:'application/json',body:JSON.stringify({volume:[0,1,5,100,1800,1400,850,144].map((count,i)=>({date:`2026-11-${13+i}`,count}))})});
    });
    await page.route('**/api/v1/workspaces/w-1/analytics/overview?*',route=>{
      if(new URL(route.request().url()).searchParams.get('period')!=='7d')return route.fallback();
      return route.fulfill({contentType:'application/json',body:JSON.stringify({period:'7d',compare:'previous_7d',totals:{mentions:4300,sources:20,new_today:158,avg_discovery_seconds:360},deltas:{mentions_pct:32976.92}})});
    });
    await page.addInitScript(()=>localStorage.setItem('sentinel_session',JSON.stringify({token:'test-session-token'})));
    await page.goto(`${production.url}/analytics`);
    for(const [period,buckets] of [['7 days',8],['24 hours',25],['30 days',31],['90 days',91]]) {
      await page.getByRole('tab',{name:period,exact:true}).click();
      await expect(page.locator('.analytics-data-table tbody tr')).toHaveCount(buckets);
      await expect(page.locator('.source-legend > span')).toHaveCount(20);
      await expect.poll(()=>page.locator('.analytics-recharts').evaluate(node=>{
        const card=node.closest('.volume-card'),details=card.querySelector('details'),svg=node.querySelector('.recharts-surface');
        if(!svg)return false;
        const c=card.getBoundingClientRect(),w=node.getBoundingClientRect(),d=details.getBoundingClientRect(),s=svg.getBoundingClientRect();
        return w.height>=240&&Math.abs(s.width-w.width)<=1&&Math.abs(s.height-w.height)<=1&&s.right<=c.right&&s.bottom<=d.top+1&&c.bottom-d.bottom<40;
      })).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    }
    const before=await page.locator('.analytics-recharts').boundingBox();
    await page.locator('.analytics-data-table summary').click();
    await expect(page.locator('.analytics-data-table')).toHaveAttribute('open','');
    const after=await page.locator('.analytics-recharts').boundingBox();
    expect(after.height).toBeGreaterThanOrEqual(240);
    expect(Math.abs(after.width-before.width)).toBeLessThanOrEqual(1);
    const tableFits=await page.locator('.analytics-data-table').evaluate(node=>{const r=node.getBoundingClientRect(),c=node.closest('.volume-card').getBoundingClientRect();return r.left>=c.left&&r.right<=c.right&&node.clientHeight<=300;});
    expect(tableFits).toBe(true);
    await page.locator('.analytics-data-table summary').click();
    await page.getByRole('tab',{name:'7 days',exact:true}).click();
    await expect(page.locator('.analytics-data-table tbody tr')).toHaveCount(8);
    await expect(page.locator('.volume-number strong')).toHaveText('4,300');
    const counts=await page.locator('.analytics-data-table tbody tr td:last-child').allTextContents();
    expect(counts.map(value=>Number(value.replaceAll(',','')))).toEqual([0,1,5,100,1800,1400,850,144]);
    const barWidths=await page.locator('.recharts-bar-rectangle path').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));
    expect(barWidths.length).toBeGreaterThan(0);
    expect(barWidths.every(value=>value<=49)).toBe(true);
    await page.screenshot({path:`/tmp/sentinel-analytics-chart-${width}.png`,fullPage:true});
  }finally{await production.close();}
});
