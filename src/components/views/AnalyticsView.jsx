import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useResource } from "../../lib/workspace";
import { PageMotion, ResourceState } from "../common/WorkspaceUI";

const panels = [
  ["overview", "Workspace overview"],
  ["volume", "Mention volume"],
  ["sentiment", "Discussion tone"],
  ["sources", "Source distribution"],
  ["keywords", "Top keywords"],
  ["discovery-time", "Discovery time"],
];
const label = (key) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (letter) => letter.toUpperCase());
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const display = (value) => typeof value === "number"
  ? value.toLocaleString(undefined, { maximumFractionDigits: 20 })
  : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);

// The supplied OpenAPI defines objects, not fixed analytics fields. Render
// returned labels/values without guessing totals, percentages, units, or scope.
function AnalyticsValue({ value, title, depth = 0 }) {
  const [visible, setVisible] = useState(50);
  const reduced = useReducedMotion();
  if (value === null) return <span className="analytics-unavailable">Not available</span>;
  if (typeof value !== "object") return <span className="analytics-value">{display(value)}</span>;
  if (depth > 8) return <p className="metric-subtitle">More detail is not available in this view.</p>;
  if (Array.isArray(value)) {
    if (!value.length) return <p className="metric-subtitle">No data available yet.</p>;
    // A chart is only appropriate when the response explicitly supplies dates
    // and numeric counts. All other shapes retain their supplied fields below.
    const timeline = value.every((row) => record(row) && typeof row.date === "string" && typeof row.count === "number" && Number.isFinite(row.count) && row.count >= 0);
    const maximum = timeline ? Math.max(1, ...value.map((row) => row.count)) : 1;
    return <>
      {timeline && <div className="bar-chart" role="img" aria-label={`${title}: ${value.slice(0, visible).map((row) => `${row.date}: ${row.count}`).join(", ")}`}>
        {value.slice(0, visible).map((row, index) => <div className="bar-track" key={index}>
          <motion.div className="bar recent" initial={{height: reduced ? `${row.count / maximum * 100}%` : 0}}
            animate={{height: `${row.count / maximum * 100}%`}} transition={{duration: reduced ? 0 : .4}}
            title={`${row.date}: ${row.count}`} />
        </div>)}
      </div>}
      <ol className="analytics-records">{value.slice(0, visible).map((item, index) => <li key={index}><AnalyticsValue value={item} title={title} depth={depth + 1} /></li>)}</ol>
      {visible < value.length && <button className="text-link" onClick={() => setVisible((count) => count + 50)}>Show more ({visible} of {value.length})</button>}
    </>;
  }
  const entries = Object.entries(value);
  if (!entries.length) return <p className="metric-subtitle">No data available yet.</p>;
  return <dl className="analytics-fields">{entries.map(([key, item]) => <div key={key}>
    <dt>{label(key)}</dt><dd><AnalyticsValue value={item} title={label(key)} depth={depth + 1} /></dd>
  </div>)}</dl>;
}

function AnalyticsPanel({ endpoint, title }) {
  const resource = useResource(`/analytics/${endpoint}`);
  const valid = record(resource.data);
  const malformed = !resource.loading && !resource.error && resource.data !== null && !valid;
  const state = malformed ? { ...resource, error: "We couldn’t load this information. Please try again." } : resource;
  const value = valid && "data" in resource.data ? resource.data.data : resource.data;
  return <section className={`chart-card analytics-panel analytics-panel-${endpoint}`} aria-label={title} aria-busy={resource.loading}>
    <h2>{title}</h2>
    <ResourceState resource={state} />
    {!state.loading && !state.error && valid && <AnalyticsValue value={value} title={title} />}
  </section>;
}

export default function AnalyticsView() {
  const [version, setVersion] = useState(0);
  return <PageMotion className="research-page">
    <div className="research-heading"><div>
      <h1>Analytics</h1><p>Workspace insights reported by your analytics service.</p>
    </div><button className="outline-button" onClick={() => setVersion((value) => value + 1)}><RefreshCw size={14} /> Refresh analytics</button></div>
    <p className="list-note">Coverage and reporting periods follow the information supplied by the service.</p>
    <div className="dedicated-analytics-grid">{panels.map(([endpoint, title]) => <AnalyticsPanel key={`${version}:${endpoint}`} endpoint={endpoint} title={title} />)}</div>
  </PageMotion>;
}
