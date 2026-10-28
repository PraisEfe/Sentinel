import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { listen, stop } from './helpers/productionServer.js';
function run(target, token) {
  return new Promise((resolve,reject)=>{
    const env={...process.env,API_PROXY_TARGET:target};
    delete env.SENTINEL_TEST_TOKEN;delete env.SENTINEL_TEST_WORKSPACE_ID;
    if(token)env.SENTINEL_TEST_TOKEN=token;
    const child=spawn(process.execPath,['scripts/check-analytics.js'],{cwd:process.cwd(),env,stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
    child.on('error',reject);child.on('close',code=>resolve({code,output}));
  });
}
test('diagnostics compare all six variants using real HTTP without logging credentials or upstream exceptions',async()=>{
  const calls=[];
  const upstream=createServer((req,res)=>{
    const url=new URL(req.url,'http://backend.test');calls.push({method:req.method,url,auth:req.headers.authorization});
    res.setHeader('Content-Type','application/json');
    if(url.pathname.endsWith('/auth/me'))return res.end(JSON.stringify({user:{id:'diagnostic-user'}}));
    if(url.pathname==='/api/v1/workspaces')return res.end(JSON.stringify({data:[{id:'authorized-workspace'}]}));
    res.statusCode=url.searchParams.get('from')?.includes('T')?500:200;
    res.end(JSON.stringify(res.statusCode===500?{message:'SQLSTATE password=private-value'}:{totals:{mentions:1}}));
  });
  const target=await listen(upstream);
  try {
    const result=await run(target,'synthetic-private-token');
    expect(result.code).toBe(1);
    const analytics=calls.filter(call=>call.url.pathname.includes('/analytics/'));
    expect(analytics).toHaveLength(18);
    expect(analytics.every(call=>call.method==='GET'&&call.auth==='Bearer synthetic-private-token')).toBe(true);
    for(const endpoint of ['overview','volume','sentiment','sources','keywords','discovery-time'])expect(analytics.filter(call=>call.url.pathname.endsWith('/'+endpoint))).toHaveLength(3);
    expect(result.output).toContain('timestamp-filtered request fails while unfiltered succeeds');
    for(const secret of ['synthetic-private-token','SQLSTATE','private-value','authorized-workspace'])expect(result.output).not.toContain(secret);
  } finally {await stop(upstream);}
});
test('unauthenticated diagnostics stop before analytics rather than claiming to test protected data',async()=>{
  const paths=[];
  const upstream=createServer((req,res)=>{
    paths.push(req.url);res.setHeader('Content-Type','application/json');res.statusCode=req.url.endsWith('/auth/login')?422:401;res.end(JSON.stringify({message:'Not authenticated'}));
  });
  const target=await listen(upstream);
  try {
    const result=await run(target);
    expect(result.code).toBe(2);expect(result.output).toContain('BLOCKED:');
    expect(paths).toEqual(['/api/v1/auth/me','/api/v1/workspaces','/api/v1/auth/login']);
  } finally {await stop(upstream);}
});
