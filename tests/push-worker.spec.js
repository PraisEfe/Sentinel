import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../public/push-sw.js',import.meta.url),'utf8');
function worker(subscribed=true) {
  const listeners={}, notifications=[], opened=[];
  const self={
    addEventListener:(name,handler)=>{listeners[name]=handler;},
    skipWaiting:()=>{},location:{origin:'https://sentinel.example'},
    registration:{pushManager:{getSubscription:async()=>subscribed?{}:null},showNotification:async(title,options)=>{notifications.push({title,...options});}},
    clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async(url)=>{opened.push(url);}},
  };
  runInNewContext(script,{self,URL});
  return {self,notifications,opened,dispatch:async(name,event={})=>{
    let promise;listeners[name]({...event,waitUntil:value=>{promise=value;}});await promise;
  }};
}
test('push worker shows private generic content and ignores untrusted navigation',async()=>{
  const service=worker();
  await service.dispatch('push',{data:{json:()=>({title:'Private search',body:'secret',url:'https://attacker.example'})}});
  expect(service.notifications).toHaveLength(1);
  expect(service.notifications[0].title).toBe('Sentinel');
  expect(JSON.stringify(service.notifications)).not.toContain('Private search');
  expect(JSON.stringify(service.notifications)).not.toContain('secret');
  await service.dispatch('notificationclick',{notification:{close:()=>{},data:{url:'https://attacker.example'}}});
  expect(service.opened).toEqual(['https://sentinel.example/alerts']);
});
test('worker does not display queued pushes after local unsubscription',async()=>{
  const service=worker(false);await service.dispatch('push');expect(service.notifications).toHaveLength(0);
});
test('worker focuses an existing same-origin window',async()=>{
  const service=worker();let navigated='',focused=false;
  service.self.clients.matchAll=async()=>[{url:'https://unrelated.example'}, {url:'https://sentinel.example/search',navigate:async(url)=>{navigated=url;return {focus:async()=>{focused=true;}};}}];
  await service.dispatch('notificationclick',{notification:{close:()=>{}}});
  expect(navigated).toBe('https://sentinel.example/alerts');expect(focused).toBe(true);expect(service.opened).toEqual([]);
});
test('real service worker installs from the frontend origin without prompting for push permission',async({page})=>{
  await page.goto('/signin');
  const result=await page.evaluate(async()=>{
    const before=Notification.permission;
    await navigator.serviceWorker.register('/push-sw.js',{scope:'/'});
    const registration=await navigator.serviceWorker.ready;
    return {script:new URL(registration.active.scriptURL).pathname,scope:new URL(registration.scope).pathname,before,after:Notification.permission};
  });
  expect(result.script).toBe('/push-sw.js');expect(result.scope).toBe('/');expect(result.after).toBe(result.before);
});
