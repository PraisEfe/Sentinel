export const supportedAnalyticsPeriods = { "24 hours": "24h", "7 days": "7d", "30 days": "30d", "90 days": "90d" };
export const periods = { "24 hours": 1, "7 days": 7, "30 days": 30, "90 days": 90 };
export const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
export const unwrap = (value) => object(value) && "data" in value ? value.data : value;
export function numeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  return Number(value);
}
export function metric(value, keys, signed = false) {
  const data = unwrap(value);
  for (const key of keys) {
    const result = numeric(key.split(".").reduce((item, part) => item?.[part], data));
    if (result !== null && (signed || result >= 0)) return result;
  }
  return null;
}
export function reportingRange(period, now = new Date()) {
  const to = now.toISOString();
  return { from: new Date(now.getTime() - periods[period] * 86400000).toISOString(), to };
}
// A query string alone cannot prove that an undocumented server filter worked.
export function confirmsRange(payload, range) {
  const data = unwrap(payload);
  for (const scope of [payload?.meta, payload?.range, payload?.period, data?.range, data?.period, data, payload]) {
    if (!object(scope)) continue;
    const from = scope.from ?? scope.period_start ?? scope.start;
    const to = scope.to ?? scope.period_end ?? scope.end;
    if (typeof from === "string" && typeof to === "string" && Math.abs(Date.parse(from) - Date.parse(range.from)) < 1000 && Math.abs(Date.parse(to) - Date.parse(range.to)) < 1000) return true;
  }
  return false;
}
export function records(payload, keys = []) {
  let value = unwrap(payload);
  if (Array.isArray(value)) return value;
  if (!object(value)) return null;
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  if (!Object.keys(value).length) return [];
  return null;
}
export function volumeSeries(payload, range) {
  const rows = records(payload, ["series", "buckets", "volume", "points"]);
  if (!rows) return null;
  const scoped = !range || confirmsRange(payload, range);
  const mapped = rows.map((row) => {
    const date = row?.date ?? row?.day ?? row?.timestamp ?? row?.bucket;
    const count = metric(row, ["count", "mention_count", "mentions", "value"]);
    return typeof date === "string" && Number.isFinite(Date.parse(date)) && count !== null ? { date, count } : null;
  });
  if (mapped.some((row) => !row)) return null;
  return mapped.filter((row) => scoped || (Date.parse(row.date) >= Date.parse(range.from) && Date.parse(row.date) <= Date.parse(range.to))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
export function breakdown(payload, kind) {
  const rows = records(payload, [kind, "items", "breakdown"]);
  if (rows) {
    const mapped = rows.map((row) => {
      const rawName = row?.name ?? row?.label ?? row?.keyword ?? row?.word ?? row?.term ?? row?.location ?? row?.country_code ?? row?.type ?? row?.source?.name;
      const name = kind === "keywords" && typeof rawName === "number" && Number.isFinite(rawName) ? String(rawName) : rawName;
      const count = metric(row, ["count", "mention_count", "mentions", "value"]);
      const explicitPercentage = metric(row, ["percentage", "percent", "share_percent"]);
      const share = metric(row, ["share"]);
      const percentage = explicitPercentage ?? (share !== null && share <= 1 ? share * 100 : null);
      if (typeof name !== "string" || !name.trim() || (count === null && percentage === null && kind !== "keywords")) return null;
      return { name, count, percentage: percentage !== null && percentage <= 100 ? percentage : null };
    });
    return mapped.some((item) => !item) ? null : mapped;
  }
  const data = unwrap(payload);
  if (object(data) && Object.values(data).every((item) => numeric(item) !== null && numeric(item) >= 0)) return Object.entries(data).map(([name, count]) => ({name, count: numeric(count), percentage: null}));
  return null;
}
export function toneValues(payload) {
  const root = unwrap(payload);
  const data = object(root?.sentiment) ? root.sentiment : root;
  if (!object(data)) return null;
  const values = ["positive", "neutral", "negative"].map((key) => metric(data, [key, `${key}.count`]));
  if (values.some((value) => value === null)) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return { total, entries: values.map((count, i) => ({ name: ["positive", "neutral", "negative"][i], count, percentage: total ? count / total * 100 : null })) };
}

export function reportedDays(payload) {
  const value = unwrap(payload);
  const period = value?.period ?? payload?.period ?? payload?.meta?.period;
  if (typeof period !== "string") return null;
  const match = /^(\d+(?:\.\d+)?)([dh])$/.exec(period);
  const days = match ? Number(match[1]) / (match[2] === "h" ? 24 : 1) : null;
  return days !== null && Number.isFinite(days) && days > 0 ? days : null;
}
export function periodLabel(days, hourly = false) {
  if (days === null) return null;
  const amount = hourly ? days * 24 : days;
  const unit = hourly ? "hour" : "day";
  return `${Number(amount.toFixed(2))} ${Math.abs(amount - 1) < .0001 ? unit : `${unit}s`}`;
}
export function comparisonPeriod(payload) {
  const compare = unwrap(payload)?.compare;
  if (typeof compare !== "string" || !compare.startsWith("previous_")) return null;
  const period = compare.slice("previous_".length);
  return periodLabel(reportedDays({period}), period.endsWith("h"));
}
export function hasReportedScope(payload, range) {
  return confirmsRange(payload, range) || reportedDays(payload) !== null;
}
