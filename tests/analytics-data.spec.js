import { test, expect } from '@playwright/test';
import { confirmsRange, metric, volumeSeries, toneValues, breakdown } from '../src/lib/analytics.js';
const range={from:'2026-10-01T00:00:00.000Z',to:'2026-10-31T00:00:00.000Z'};
test('period totals require matching scope and preserve explicit zero without coercing missing values',()=>{
  expect(confirmsRange({total_mentions:999},range)).toBe(false);
  expect(confirmsRange({meta:{from:range.from,to:range.to}},range)).toBe(true);
  expect(confirmsRange({meta:{from:'2026-01-01',to:range.to}},range)).toBe(false);
  for(const value of [null,'',false,[],{},'oops'])expect(metric({total:value},['total'])).toBeNull();
  expect(metric({total:0},['total'])).toBe(0);
  expect(metric({total:'12.5'},['total'])).toBe(12.5);
});
test('volume excludes out-of-range points without inventing empty date buckets',()=>{
  expect(volumeSeries({data:[{date:'2026-09-01',count:99},{date:'2026-10-10',count:2},{date:'2026-10-20',count:0}]},range)).toEqual([{date:'2026-10-10',count:2},{date:'2026-10-20',count:0}]);
  expect(volumeSeries({data:[{date:'invalid',count:5}]},range)).toBeNull();
  expect(volumeSeries({data:[{date:'2026-10-01',count:null}]},range)).toBeNull();
});
test('sentiment requires complete categories and breakdowns do not invent percentage units',()=>{
  expect(toneValues({positive:80,negative:20})).toBeNull();
  expect(toneValues({positive:0,neutral:0,negative:0}).entries[0].percentage).toBeNull();
  expect(toneValues({positive:59,neutral:28,negative:13}).entries[0].percentage).toBe(59);
  expect(breakdown({data:[{name:'News',count:25}]},'sources')).toEqual([{name:'News',count:25,percentage:null}]);
});
