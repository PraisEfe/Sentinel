import { useState } from "react";
import { RefreshCw, Globe, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useResource, number } from "../../lib/workspace";
import { PageMotion, ResourceState, Tabs } from "../common/WorkspaceUI";
import { periods, reportingRange, volumeSeries, breakdown, toneValues, metric, records, reportedDays, periodLabel, comparisonPeriod, hasReportedScope } from "../../lib/analytics";

function Status({ resource, invalid = false, empty = false }) {
  return <ResourceState resource={invalid && !resource.loading && !resource.error ? {...resource, error: "We couldn’t load this information. Please try again."} : resource} empty={!resource.loading && !resource.error && empty}>No data available for this period.</ResourceState>;
}
const ready = (resource) => !resource.loading && !resource.error;
const pct = (value) => value === null ? "—" : `${Math.round(value)}%`;
export default function AnalyticsView() {
  const [{period, range}, setSelection] = useState(() => ({period:"30 days", range:reportingRange("30 days")}));
  const setPeriod = (next) => setSelection({period:next, range:reportingRange(next)});
  const reduced = useReducedMotion();
  const query = `?${new URLSearchParams(range)}`;
  const overview = useResource(`/analytics/overview${query}`);
  const volume = useResource(`/analytics/volume${query}`);
  const sentiment = useResource(`/analytics/sentiment${query}`);
  const sources = useResource(`/analytics/sources${query}`);
  const keywords = useResource(`/analytics/keywords${query}`);
  const discovery = useResource(`/analytics/discovery-time${query}`);
  // These intelligence endpoints have no documented date filter. Their cards
  // explicitly describe latest available data instead of implying period scope.
  const trending = useResource("/intelligence/trending", {list:true});
  const geography = useResource("/intelligence/geography", {list:true});
  const overviewScoped = hasReportedScope(overview.data, range);
  const actualDays = reportedDays(overview.data);
  const actualPeriod = periodLabel(actualDays);
  const periodMismatch = actualDays !== null && Math.abs(actualDays - periods[period]) > .01;
  const comparison = comparisonPeriod(overview.data);
  const newToday = overviewScoped ? metric(overview.data,["totals.new_today","new_today"]) : null;
  const cardPeriod = (payload) => { const days = reportedDays(payload); return days !== null && Math.abs(days - periods[period]) > .01 ? `Reported ${periodLabel(days)}` : null; };
  const total = overviewScoped ? metric(overview.data,["totals.mentions","mention_count","total_mentions","mention_volume","mentions.total"]) : null;
  const sourceCount = overviewScoped ? metric(overview.data,["totals.sources","source_count","active_sources","total_sources"]) : null;
  const growth = overviewScoped ? metric(overview.data,["deltas.mentions_pct","growth_percent","change_percent","growth_percentage","comparison.growth_percent"],true) : null;
  const series = volumeSeries(volume.data, range);
  const tone = hasReportedScope(sentiment.data,range) ? toneValues(sentiment.data) : null;
  const sourceRows = hasReportedScope(sources.data,range) ? breakdown(sources.data,"sources") : null;
  const keywordRows = hasReportedScope(keywords.data,range) ? breakdown(keywords.data,"keywords") : null;
  const places = breakdown(geography.data,"geography");
  const topics = records(trending.data) || [];
  const discoveryMinutes = hasReportedScope(discovery.data,range) ? metric(discovery.data,["average_minutes","average_discovery_minutes"]) : null;
  const discoverySeconds = overviewScoped ? metric(overview.data,["totals.avg_discovery_seconds","avg_discovery_seconds"]) : null;
  const discoveryLabel = discoverySeconds !== null ? `${Math.floor(Math.round(discoverySeconds)/60)}m ${Math.round(discoverySeconds)%60}s` : discoveryMinutes !== null ? `${number(discoveryMinutes)}m` : null;
  const positive = tone?.entries[0].percentage ?? null;
  const unconfirmed = [overview,sentiment,sources,keywords].some((resource) => ready(resource) && resource.data && !hasReportedScope(resource.data,range));
  const labelDate = (date) => new Date(date).toLocaleString(undefined,period === "24 hours" ? {hour:"numeric",minute:"2-digit"} : {day:"numeric",month:"short"});
  const sourceTotal = sourceRows?.reduce((sum,item)=>sum+(item.count??0),0) || 0;
  const geoMax = Math.max(1,...(places || []).map((item)=>item.count || 0));
  return <PageMotion className="research-page analytics-page">
    <div className="research-heading"><div><h1>Analytics</h1><p>Understand patterns across information collected from your searches and monitors.</p></div>
      <Tabs label="Analytics time period" items={Object.keys(periods)} value={period} onChange={setPeriod} />
    </div>
    <div className="analytics-context"><span><Globe size={12} /> Workspace activity{discoveryLabel!==null && <small> · {discoveryLabel} average discovery</small>}</span><button className="text-link" onClick={()=>{setSelection({period,range:reportingRange(period)});trending.reload();geography.reload();}}><RefreshCw size={12} /> Refresh analytics</button></div>
    {discovery.error && <Status resource={discovery}/> }
    {periodMismatch && <p className="analytics-scope-note" role="status">Showing totals for the service’s reported {actualPeriod}, instead of the selected {period}.</p>}
    {unconfirmed && <p className="analytics-scope-note" role="status">The service hasn’t confirmed this reporting period. Unverified totals are shown as unavailable.</p>}
    <div className="analytics-grid">
      <section className="chart-card volume-card" aria-label="Mention volume">
        <div className="metric-caption">Mention volume · {periodMismatch ? `reported ${actualPeriod}` : period}</div>
        <Status resource={overview} />
        <div className="volume-number"><strong>{ready(overview) ? number(total) : "—"}</strong>{growth!==null && <span className={growth<0?"negative-growth":""}><ArrowUpRight size={12} style={{transform:growth<0?"rotate(90deg)":undefined}}/>{growth>0?"+":""}{growth}%</span>}</div>
        <p className="metric-subtitle">Public mentions across {number(sourceCount)} active sources{newToday!==null && <> · {number(newToday)} new today</>}</p>
        {comparison && growth!==null && <p className="analytics-card-caption comparison-caption">Compared with previous {comparison}</p>}
        {periodMismatch && <p className="metric-subtitle">Chart: returned dates within the selected {period}.</p>}
        <Status resource={volume} invalid={ready(volume) && volume.data!==null && series===null} empty={series?.length===0} />
        {ready(volume) && series?.length>0 && <>
          <div className="analytics-recharts" role="img" aria-label={`Mention volume for ${period}: ${series.map((point)=>`${labelDate(point.date)}: ${point.count}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={series} margin={{top:12,right:0,bottom:0,left:0}} barCategoryGap="12%" accessibilityLayer>
                <XAxis dataKey="date" tickFormatter={labelDate} tickLine={false} axisLine={{stroke:"#e0e8e2"}} minTickGap={24} tick={{fontSize:9,fill:"#8a9f91"}}/>
                <YAxis hide domain={[0,"auto"]}/><Tooltip labelFormatter={labelDate} formatter={(value)=>[number(value),"Mentions"]} cursor={{fill:"#f0f5f1"}}/>
                <Bar dataKey="count" radius={[2,2,0,0]} isAnimationActive={!reduced} animationDuration={450}>
                  {series.map((point,index)=><Cell key={`${point.date}:${index}`} fill={index>=series.length-4?"#4c9270":"#c9dcd1"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="analytics-data-table"><summary>View chart data</summary><table><caption>Returned mention counts</caption><thead><tr><th>Date</th><th>Mentions</th></tr></thead><tbody>{series.map((row,index)=><tr key={index}><td>{labelDate(row.date)}</td><td>{number(row.count)}</td></tr>)}</tbody></table></details>
        </>}

      </section>
      <div className="analytics-side">
        <section className="chart-card" aria-label="Source distribution"><div className="metric-caption">Source distribution</div><strong className="card-big-number">{number(sourceCount)}</strong><p className="metric-subtitle">Active sources{periodMismatch ? ` · reported ${actualPeriod}` : ""}</p>
          <Status resource={sources} invalid={ready(sources) && hasReportedScope(sources.data,range) && sourceRows===null}/>
          {periodMismatch && sourceRows && <p className="metric-subtitle">Breakdown: {periodLabel(reportedDays(sources.data)) || period}</p>}
          {ready(sources) && sourceRows && <div className="source-legend">{sourceRows.map((row,index)=><span key={row.name}><i className={`legend-dot color-${index%3}`}/>{row.name} {row.percentage!==null?pct(row.percentage):`${number(row.count)} mentions`}</span>)}</div>}
          {ready(sources) && sourceRows?.length===0 && <p className="metric-subtitle">No source data available.</p>}
          {sourceTotal===0 && sourceRows?.length>0 && sourceRows.every((item)=>item.count!==null) && <p className="metric-subtitle">No mentions in these sources.</p>}
        </section>
        <section className="chart-card" aria-label="Discussion tone"><div className="metric-caption">Discussion tone</div>{cardPeriod(sentiment.data) && <p className="metric-subtitle">{cardPeriod(sentiment.data)}</p>}<Status resource={sentiment}/>
          <div className="tone-head"><strong>{pct(positive)}</strong><span className="small-badge">{positive===null?"No tone data":positive>=60?"Mostly positive":"Mixed tone"}</span></div>
          {tone && <><div className="sentiment-track" aria-label="Sentiment distribution">{tone.entries.map((item)=><span key={item.name} className={item.name} style={{width:`${item.percentage??0}%`}}/>)}</div><div className="tone-legend">{tone.entries.map((item)=><span key={item.name}>{item.name} {pct(item.percentage)}</span>)}</div></>}
        </section>
      </div>
      <section className="chart-card" aria-label="Trending topics"><h2>Trending topics</h2><p className="analytics-card-caption">Latest available activity</p><Status resource={trending} empty={topics.length===0}/>
        {ready(trending) && topics.slice(0,4).map((item,index)=><div className="analytics-topic" key={item.cluster_id||index}><span>{String(index+1).padStart(2,"0")} · {item.title}</span><strong>{number(item.mention_count)}</strong><small title="Reported velocity">{number(item.velocity)}</small></div>)}
      </section>
      <section className="chart-card" aria-label="Top keywords"><h2>Top keywords</h2>{cardPeriod(keywords.data) && <p className="metric-subtitle">{cardPeriod(keywords.data)}</p>}<Status resource={keywords} invalid={ready(keywords) && hasReportedScope(keywords.data,range) && keywordRows===null}/>
        {ready(keywords) && keywordRows && <div className="keyword-tags">{keywordRows.slice(0,12).map((item)=><span key={item.name}>{item.name}</span>)}</div>}
        {ready(keywords) && (!keywordRows || keywordRows.length===0) && <p className="metric-subtitle">No verified keywords available for this period.</p>}
      </section>
      <section className="chart-card" aria-label="Geographic activity"><h2>Geographic activity</h2><p className="analytics-card-caption">Latest available locations</p><Status resource={geography} invalid={ready(geography) && geography.data!==null && places===null} empty={places?.length===0}/>
        {ready(geography) && places?.slice(0,4).map((item)=><div className="geo-row" key={item.name}><span>{item.name}</span><div><i style={{width:`${item.percentage??(item.count??0)/geoMax*100}%`}}/></div><b>{item.percentage!==null?pct(item.percentage):number(item.count)}</b></div>)}
      </section>
    </div>
  </PageMotion>;
}
