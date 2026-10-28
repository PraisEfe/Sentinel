export async function mockPushBrowser(page, options = {}) {
  await page.addInitScript(({ denied, unsupported, foreign }) => {
    if (unsupported) { Object.defineProperty(window, 'PushManager', {value:undefined, configurable:true}); Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true}); return; }
    let permission = localStorage.getItem('test_push_permission') || 'default';
    window.pushTest = { permissionRequests:0, subscriptions:0, unsubscriptions:0 };
    Object.defineProperty(Notification,'permission',{get:()=>permission, configurable:true});
    Notification.requestPermission = async () => {
      window.pushTest.permissionRequests++;
      permission = denied ? 'denied' : 'granted';
      localStorage.setItem('test_push_permission',permission);
      return permission;
    };
    if (foreign && !localStorage.getItem('test_foreign_ready')) {
      localStorage.setItem('test_foreign_ready','true'); localStorage.setItem('test_push_endpoint','https://push.example/foreign'); localStorage.setItem('sentinel_push_owner','other-account');
    }
    const makeSubscription = (endpoint) => ({ endpoint,
      toJSON:()=>({endpoint,keys:{p256dh:'browser-public-key',auth:'browser-auth-key'}}),
      unsubscribe:async()=>{window.pushTest.unsubscriptions++;localStorage.removeItem('test_push_endpoint');return true;},
    });
    const worker = {active:{scriptURL:location.origin+'/push-sw.js'},getNotifications:async()=>[],pushManager:{
      getSubscription:async()=>{const endpoint=localStorage.getItem('test_push_endpoint');return endpoint?makeSubscription(endpoint):null;},
      subscribe:async(options)=>{if (!options.userVisibleOnly || options.applicationServerKey.length!==65) throw Error('Invalid subscription options');window.pushTest.subscriptions++;const endpoint='https://push.example/current';localStorage.setItem('test_push_endpoint',endpoint);return makeSubscription(endpoint);},
    }};
    Object.defineProperty(navigator,'serviceWorker',{value:{getRegistration:async()=>worker,register:async()=>worker,ready:Promise.resolve(worker)},configurable:true});
  }, options);
}
