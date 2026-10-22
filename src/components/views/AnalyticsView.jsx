import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ANALYTICS_DATA } from "../../data/mockData";
import { useResource, useWorkspace, number } from "../../lib/workspace";
import { PageMotion, ResourceState, Tabs } from "../common/WorkspaceUI";
const EMPTY = [];
const ignored = new Set([
  "about",
  "across",
  "after",
  "their",
  "there",
  "these",
  "those",
  "which",
  "would",
  "could",
  "should",
  "while",
  "where",
  "public",
  "sources",
  "information",
  "through",
  "during",
]);
export default function AnalyticsView() {
  const [period, setPeriod] = useState("7 days");
  const { demo } = useWorkspace();
  const reduced = useReducedMotion();
  const range = useMemo(() => {
    const to = new Date();
    const days = period === "24 hours" ? 1 : parseInt(period);
    return {
      from: new Date(to - days * 86400000).toISOString(),
      to: to.toISOString(),
      days,
    };
  }, [period]);
  const mentions = useResource(
    `/search?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
    { list: true },
  );
  const clusters = useResource("/explore", { list: true });
  const rows = mentions.data?.data || EMPTY;
  const data = useMemo(() => {
    if (demo) return ANALYTICS_DATA[period];
    const values = Array(7).fill(0);
    const tone = { positive: 0, neutral: 0, negative: 0 };
    const sources = {};
    const keywords = {};
    const locations = {};
    const start = new Date(range.from).getTime();
    const duration = new Date(range.to) - start;
    for (const item of rows) {
      const index = Math.min(
        6,
        Math.max(
          0,
          Math.floor(((new Date(item.published_at) - start) / duration) * 7),
        ),
      );
      if (Number.isFinite(index)) values[index]++;
      if (item.sentiment in tone) tone[item.sentiment]++;
      const type = item.source?.type || "web";
      sources[type] = (sources[type] || 0) + 1;
      const location = item.location_name || item.country_code;
      if (location) locations[location] = (locations[location] || 0) + 1;
      for (const word of (item.title || "").toLowerCase().match(/[a-z]{4,}/g) ||
        [])
        if (!ignored.has(word)) keywords[word] = (keywords[word] || 0) + 1;
    }
    return {
      mentionVolume: rows.length,
      activeSources: new Set(
        rows.map((item) => item.source_id || item.source?.id).filter(Boolean),
      ).size,
      volumeValues: values,
      timeLabels: values.map((_, i) =>
        new Date(start + (duration * i) / 7).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      ),
      tone,
      sources,
      keywords: Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
      locations: Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
    };
  }, [demo, period, rows, range]);
  const max = Math.max(1, ...data.volumeValues);
  const toneTotal = Object.values(data.tone).reduce((sum, n) => sum + n, 0);
  const sourceTotal = Object.values(data.sources).reduce(
    (sum, n) => sum + n,
    0,
  );
  const positive = toneTotal
    ? Math.round((data.tone.positive / toneTotal) * 100)
    : 0;
  const keywords = data.keywords || [
    ["network", 1],
    ["connectivity", 1],
    ["new tariff", 1],
    ["5G", 1],
    ["customer experience", 1],
    ["data plans", 1],
    ["Lagos", 1],
    ["coverage", 1],
  ];
  const locations = data.locations || [
    ["Lagos", 36],
    ["Abuja", 23],
    ["Port Harcourt", 14],
    ["Other Nigeria", 27],
  ];
  const locationTotal = locations.reduce((sum, [, n]) => sum + n, 0);
  return (
    <PageMotion className="research-page">
      <div className="research-heading">
        <div>
          <h1>Analytics</h1>
          <p>
            Understand patterns across information collected from your searches
            and monitors.
          </p>
        </div>
        <Tabs
          label="Analytics time period"
          items={["24 hours", "7 days", "30 days", "90 days"]}
          value={period}
          onChange={setPeriod}
        />
      </div>
      <ResourceState resource={mentions} />
      <div className="analytics-grid">
        <section className="chart-card volume-card">
          <div className="metric-caption">Mention volume</div>
          <div className="volume-number">
            <strong>{mentions.error ? "—" : number(data.mentionVolume)}</strong>
            {demo && (
              <span>
                <ArrowUpRight size={12} />
                {data.growth.replace(/[^0-9.%+-]/g, "")}
              </span>
            )}
          </div>
          <p className="metric-subtitle">
            {demo ? "Public mentions" : "Returned mentions"} across{" "}
            {number(data.activeSources)} sources
          </p>
          <div
            className="bar-chart"
            role="img"
            aria-label={`Mention volume for ${period}: ${data.volumeValues.join(", ")}`}
            key={period}
          >
            {data.volumeValues.map((value, i) => (
              <div className="bar-track" key={i}>
                <motion.div
                  className={
                    i > data.volumeValues.length - 4 ? "bar recent" : "bar"
                  }
                  initial={{ height: 0 }}
                  animate={{ height: `${(value / max) * 100}%` }}
                  transition={{
                    duration: reduced ? 0 : 0.45,
                    delay: reduced ? 0 : i * 0.025,
                    ease: "easeOut",
                  }}
                  title={`${data.timeLabels[i] || i + 1}: ${value}`}
                />
              </div>
            ))}
          </div>
          <div className="chart-labels">
            {data.timeLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          {!demo && (
            <p className="list-note">
              Based on mentions returned for the selected period.
            </p>
          )}
        </section>
        <div className="analytics-side">
          <section className="chart-card">
            <div className="metric-caption">Source distribution</div>
            <strong className="card-big-number">
              {number(data.activeSources)}
            </strong>
            <p className="metric-subtitle">Active sources in this view</p>
            <div className="source-legend">
              {Object.entries(data.sources).map(([name, value], i) => (
                <span key={name}>
                  <i className={`legend-dot color-${i % 3}`} />
                  {name}{" "}
                  {sourceTotal ? Math.round((value / sourceTotal) * 100) : 0}%
                </span>
              ))}
            </div>
          </section>
          <section className="chart-card">
            <div className="metric-caption">Discussion tone</div>
            <div className="tone-head">
              <strong>{positive}%</strong>
              <span className="small-badge">
                {toneTotal
                  ? positive >= 50
                    ? "Mostly positive"
                    : "Mixed discussion"
                  : "No tone data"}
              </span>
            </div>
            <div className="sentiment-track">
              {Object.entries(data.tone).map(([name, value]) => (
                <span
                  key={name}
                  className={name}
                  style={{
                    width: `${toneTotal ? (value / toneTotal) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>
            <div className="tone-legend">
              {Object.entries(data.tone).map(([name, value]) => (
                <span key={name}>
                  {name} {toneTotal ? Math.round((value / toneTotal) * 100) : 0}
                  %
                </span>
              ))}
            </div>
          </section>
        </div>
        <section className="chart-card">
          <h2>Trending topics</h2>
          <ResourceState
            resource={clusters}
            empty={!clusters.data?.data?.length}
          />
          {[...(clusters.data?.data || [])]
            .sort((a, b) => Number(b.velocity) - Number(a.velocity))
            .slice(0, 4)
            .map((item, i) => (
              <div className="analytics-topic" key={item.id}>
                <span>
                  {String(i + 1).padStart(2, "0")} · {item.title}
                </span>
                <strong>{number(item.mention_count)}</strong>
                <small>{number(item.velocity)}%</small>
              </div>
            ))}
        </section>
        <section className="chart-card">
          <h2>Top keywords</h2>
          <div className="keyword-tags">
            {keywords.map(([word]) => (
              <span key={word}>{word}</span>
            ))}
          </div>
          {!keywords.length && (
            <p className="metric-subtitle">No keywords available.</p>
          )}
        </section>
        <section className="chart-card">
          <h2>Geographic activity</h2>
          {locations.map(([location, value]) => (
            <div className="geo-row" key={location}>
              <span>{location}</span>
              <div>
                <motion.i
                  initial={{ width: 0 }}
                  animate={{
                    width: `${locationTotal ? (value / locationTotal) * 100 : 0}%`,
                  }}
                  transition={{ duration: reduced ? 0 : 0.4 }}
                />
              </div>
              <b>
                {locationTotal ? Math.round((value / locationTotal) * 100) : 0}%
              </b>
            </div>
          ))}
          {!locations.length && (
            <p className="metric-subtitle">No location data is available.</p>
          )}
        </section>
      </div>
    </PageMotion>
  );
}
