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

test('production overview nested fields and floating-point periods retain their reported scope',async()=>{
  const {reportedDays,periodLabel,comparisonPeriod,hasReportedScope}=await import('../src/lib/analytics.js');
  const value={period:'30.999999999988d',compare:'previous_30.999999999988d',totals:{mentions:1961,new_today:0,sources:35,avg_discovery_seconds:3208},deltas:{mentions_pct:100}};
  expect(metric(value,['totals.mentions'])).toBe(1961);
  expect(metric(value,['totals.new_today'])).toBe(0);
  expect(metric(value,['totals.sources'])).toBe(35);
  expect(metric(value,['totals.avg_discovery_seconds'])).toBe(3208);
  expect(metric(value,['deltas.mentions_pct'],true)).toBe(100);
  expect(periodLabel(reportedDays(value))).toBe('31 days');
  expect(comparisonPeriod(value)).toBe('31 days');
  expect(hasReportedScope(value,range)).toBe(true);
  expect(confirmsRange(value,range)).toBe(false);
  for(const period of ['', 'Infinityd', '-2d', 'unknown'])expect(reportedDays({period})).toBeNull();
});


test('live analytics wrappers preserve API ratios and every returned volume bucket',()=>{
  const sentiment=toneValues({sentiment:{positive:0.1433,neutral:0.7517,negative:0.105}});
  expect(sentiment.entries[0].percentage).toBeCloseTo(14.33,5);
  const sources=breakdown({sources:[{source_id:'source-1',name:'News',count:1367,share:0.5872}]},'sources');
  expect(sources[0].percentage).toBeCloseTo(58.72,5);
  expect(sources[0].count).toBe(1367);
  expect(breakdown({keywords:[{term:'network',count:1218}]},'keywords')[0].name).toBe('network');
  expect(volumeSeries({volume:[{date:'2026-09-28',count:0},{date:'2026-10-28',count:10}]})).toHaveLength(2);
});

test("numeric keyword terms remain visible without coercing malformed names", () => {
  expect(breakdown({ keywords: [{ term: 2026, count: 3 }] }, "keywords")).toEqual([{ name: "2026", count: 3, percentage: null }]);
  expect(breakdown({ keywords: [{ term: null, count: 3 }] }, "keywords")).toBeNull();
});
