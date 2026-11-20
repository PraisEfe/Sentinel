import { test, expect } from '@playwright/test';
import { mockApi, login } from './helpers/apiFixtures.js';
const stories = Array.from({length:10},(_,i)=>({id:`story-${i+1}`,cluster_id:`story-${i+1}`,title:`Story ${i+1}`,mention_count:i+1,summary:'A verified story summary from the API.',last_seen_at:new Date().toISOString()}));
const fulfill=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});

test('story pages buffer API batches, preserve all stories and merge a short final page',async({page})=>{
  await mockApi(page);
  const batches=[];
  await page.route('**/api/v1/workspaces/w-1/explore?*',route=>{
    const batch=Number(new URL(route.request().url()).searchParams.get('page'));batches.push(batch);
    return fulfill(route,{data:stories.slice((batch-1)*4,batch*4),meta:{total:10,last_page:3,current_page:batch}});
  });
  await login(page);await page.goto('/intelligence');
  await expect(page.locator('.cluster-row')).toHaveCount(3);
  const pagination=page.locator('.story-pagination');
  await expect(pagination).toContainText('Page 1 of 3');
  const visible=[];
  for(const [number,count] of [[1,3],[2,3],[3,4]]) {
    await expect(pagination).toContainText(`Page ${number} of 3`);
    await expect(page.locator('.cluster-row')).toHaveCount(count);
    visible.push(...await page.locator('.cluster-copy > strong').allTextContents());
    if(number<3)await pagination.getByRole('button',{name:'Next',exact:true}).click();
  }
  expect(visible).toEqual(stories.map(story=>story.title));
  await expect(pagination.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
  const requestCount=batches.length;
  await pagination.getByRole('button',{name:'Previous',exact:true}).click();
  await expect(page.locator('.cluster-copy > strong').first()).toHaveText('Story 4');
  expect(batches.length).toBe(requestCount);
  expect([...new Set(batches)]).toEqual([1,2,3]);
});

for(const [tab,endpoint] of [['Trending','trending'],['Emerging','emerging'],['Most Mentioned','most-mentioned']])test(`${tab} paginates the API list without dropping its final items`,async({page})=>{
  await mockApi(page);
  await page.route(`**/api/v1/workspaces/w-1/intelligence/${endpoint}`,route=>fulfill(route,{data:stories.slice(0,8).map(s=>({...s,name:s.title,monitor_id:s.id,previous_count:0,delta_pct:100}))}));
  await login(page);await page.goto('/intelligence');
  await page.getByRole('tab',{name:tab,exact:true}).click();
  await expect(page.locator('.cluster-row')).toHaveCount(3);
  await page.locator('.story-pagination').getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.cluster-row')).toHaveCount(5);
  await expect(page.locator('.cluster-copy > strong').first()).toHaveText('Story 4');
  await expect(page.locator('.cluster-copy > strong').last()).toHaveText('Story 8');
  await page.getByRole('tab',{name:'Latest',exact:true}).click();
  await page.getByRole('tab',{name:tab,exact:true}).click();
  await expect(page.locator('.story-pagination')).toContainText('Page 1 of 2');
});

test('fewer than three available stories stay honest and a failed lookahead can be retried',async({page})=>{
  await mockApi(page);
  let failing=true;
  await page.route('**/api/v1/workspaces/w-1/explore?*',route=>{
    const batch=Number(new URL(route.request().url()).searchParams.get('page'));
    if(batch===2&&failing)return fulfill(route,{message:'Internal server details'},500);
    return fulfill(route,{data:stories.slice((batch-1)*3,batch*3),meta:{total:6,last_page:2}});
  });
  await login(page);await page.goto('/intelligence');
  const panel=page.locator('.cluster-panel');
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(panel).not.toContainText('Internal server details');
  failing=false;await panel.getByRole('button',{name:'Try again'}).click();
  await expect(page.locator('.cluster-row')).toHaveCount(3);
  await page.getByRole('tab',{name:'Trending',exact:true}).click();
  await expect(page.locator('.cluster-row')).toHaveCount(1);
  await expect(panel).toContainText('Only one item is available');
});

for(const width of [320,768,1440])test(`emerging stories follow the feed and discovery numbers sit above labels at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await mockApi(page);
  await page.route('**/api/v1/workspaces/w-1/explore?*',route=>fulfill(route,{data:stories.slice(0,7),meta:{total:7,last_page:1}}));
  await login(page);await page.goto('/intelligence');
  await expect(page.locator('.cluster-row')).toHaveCount(3);
  const positions=await page.evaluate(()=>{
    const feed=document.querySelector('.cluster-panel').getBoundingClientRect(),emerging=document.querySelector('.emerging-panel').getBoundingClientRect();
    return {emergingBelow:emerging.top>=feed.bottom,aligned:Math.abs(emerging.left-feed.left)<1,metrics:[...document.querySelectorAll('.discovery-metric')].map(node=>{const label=node.querySelector('dt'),value=node.querySelector('dd');return {above:value.getBoundingClientRect().bottom<=label.getBoundingClientRect().top,labelFont:parseFloat(getComputedStyle(label).fontSize),valueFont:parseFloat(getComputedStyle(value).fontSize)};})};
  });
  expect(positions.emergingBelow).toBe(true);expect(positions.aligned).toBe(true);
  for(const metric of positions.metrics){expect(metric.above).toBe(true);expect(metric.labelFont).toBeGreaterThanOrEqual(15);expect(metric.valueFont).toBeGreaterThanOrEqual(28);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:`/tmp/sentinel-intelligence-revamp-${width}.png`,fullPage:true});
});
