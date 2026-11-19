import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/apiFixtures.js';
import { startProduction } from './helpers/productionServer.js';
const stories = [
  { cluster_id:'cluster-1', title:"Jeff Bezos was ‘heavily involved’ in casting Robert Pattinson as new James Bond, Amazon founder says — kare11.com", velocity:6 },
  { cluster_id:'cluster-2', title:'Brad Pitt Mau Jadi Musuh Robert Pattinson di Film James Bond — https://kumparan.com/kumparanhits/'+'brad-pitt-mau-jadi-musuh-'.repeat(8), velocity:0 },
  { cluster_id:'cluster-3', title:'Robert Pattinson to apply for 90,000 more jobs? UK government trolls James Bond actor', velocity:4962 },
  { cluster_id:'cluster-4', title:'Former Bond Villain Rami Malek Says Robert Pattinson Will Be an Extraordinary 007: I Could Not Be More Proud', velocity:4533 },
];
for (const [width, sidebarWidth] of [[320, null], [1440, 230], [1440, 180]]) test(`production emerging cards contain every title and rate at ${width}px with sidebar ${sidebarWidth || 'auto'}`, async ({ page }) => {
  const production = await startProduction('http://127.0.0.1:1');
  try {
    await page.setViewportSize({width,height:1000});
    await page.emulateMedia({reducedMotion:'reduce'});
    await mockApi(page);
    await page.route('**/api/v1/workspaces/w-1/intelligence/emerging', route=>route.fulfill({contentType:'application/json',body:JSON.stringify({data:stories})}));
    await page.addInitScript(()=>localStorage.setItem('sentinel_session',JSON.stringify({token:'test-session-token'})));
    await page.goto(`${production.url}/intelligence`);
    await expect(page.locator('.emerging-row')).toHaveCount(4);
    // Reproduce the narrow sidebar in the report independently of viewport size.
    if(sidebarWidth) await page.addStyleTag({content:`.intelligence-layout { grid-template-columns: minmax(0, 1fr) ${sidebarWidth}px; }`});
    await page.addStyleTag({content:'.emerging-row { display:flex; align-items:center; gap:9px; } .emerging-row > span { flex:1; }'});
    for (let index=0;index<stories.length;index++) {
      const row=page.locator('.emerging-row').nth(index);
      await expect(row).toHaveCSS('display','grid');
      await expect(row.locator(':scope > span')).toHaveText(stories[index].title);
      const geometry=await row.evaluate(node=>{
        const title=node.querySelector(':scope > span'),rate=node.querySelector('b'),card=node.closest('.insight-card');
        const t=title.getBoundingClientRect(),r=rate.getBoundingClientRect(),c=card.getBoundingClientRect();
        return {fits:[node,title,rate,card].every(el=>el.scrollWidth<=el.clientWidth+1),rateBelow:r.top>=t.bottom-1,contained:t.left>=c.left&&t.right<=c.right&&r.right<=c.right};
      });
      expect(geometry).toEqual({fits:true,rateBelow:true,contained:true});
    }
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:`/tmp/sentinel-emerging-production-${width}-${sidebarWidth || "auto"}.png`,fullPage:true});
  } finally { await production.close(); }
});
