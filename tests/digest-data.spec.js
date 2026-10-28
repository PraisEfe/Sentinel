import { test, expect } from '@playwright/test';
import { digestContent } from '../src/lib/digest.js';
test('digest highlights come from summary fields, not arbitrary reference strings',()=>{
  const content=digestContent(['mention-reference',{summary:'Actual supplied summary',mentions:[{title:'Actual article',mention_id:'mention-1',url:'javascript:alert(1)'}]}]);
  expect(content.summaries).toEqual(['Actual supplied summary']);
  expect(content.details).toEqual([{label:'Included reference',value:'mention-reference'}]);
  expect(content.mentions[0].url).toBeUndefined();
  expect(content.mentions[0].id).toBe('mention-1');
});
