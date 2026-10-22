import { ANALYTICS_DATA } from "./mockData";
const stamp = (minutes = 0) =>
  new Date(Date.now() - minutes * 60000).toISOString();
export function createDemoService() {
  const sources = ["news", "social", "web", "forum", "blog"].map((type, i) => ({
    id: `source-${i}`,
    name: [
      "TechCabal",
      "Public social discussion",
      "Nairametrics",
      "Nairaland",
      "African Tech Review",
    ][i],
    type,
    available: true,
    enabled_for_workspace: true,
    is_active: true,
    language_codes: ["en"],
  }));
  const titles = [
    "MTN Nigeria announces major service infrastructure initiative",
    "Users discuss MTN network performance across Lagos",
    "What the proposed telecom tariff adjustment means for subscribers",
    "Subscribers compare new 5G coverage and data speeds",
    "How MTN’s fibre strategy could change enterprise connectivity",
    "Telecom operators publish updated service quality figures",
  ];
  const mentions = titles.map((title, i) => ({
    id: `mention-${i}`,
    title,
    body: [
      "The telecom operator has outlined a new investment programme intended to improve network resilience and expand coverage across key regions.",
      "A growing public conversation compares connectivity experiences in Ikeja, Victoria Island and surrounding districts.",
      "An analysis of pricing changes, operating costs and their likely impact on mobile subscribers in Nigeria.",
      "Community members share speed tests and coverage reports from Abuja, Port Harcourt and Lagos.",
      "Industry commentary examines recent infrastructure investments and their significance for business customers.",
      "New industry data compares reliability, reach and mobile-data adoption during the previous quarter.",
    ][i],
    source: sources[i % 5],
    source_id: sources[i % 5].id,
    sentiment: [
      "positive",
      "negative",
      "neutral",
      "positive",
      "positive",
      "neutral",
    ][i],
    published_at: stamp(i * 8 + 6),
    language: "en",
    country_code: "NG",
    metadata: [
      { topics: ["Network", "5G", "Infrastructure", "Customer service"] },
    ],
    relevance_score: "0.98",
    url: "https://techcabal.com",
    cluster_id: `cluster-${i % 4}`,
  }));
  const clusters = [
    "Network performance",
    "New service initiative",
    "Telecom tariff discussion",
    "5G coverage experiences",
  ].map((title, i) => ({
    id: `cluster-${i}`,
    cluster_id: `cluster-${i}`,
    title,
    summary: mentions[i].body,
    mention_count: [342, 127, 96, 74][i],
    source_count: [46, 18, 12, 8][i],
    velocity: [48, 52, 27, 64][i],
    first_seen_at: stamp(120 - i * 20),
    last_seen_at: stamp(i * 3 + 2),
    representative_mention: mentions[i],
  }));
  const monitors = [
    "MTN Nigeria",
    "Dangote Group",
    "Cybersecurity",
    "John Doe",
  ].map((name, i) => ({
    id: `demo-${i}`,
    name,
    query: name,
    type: i === 3 ? "person" : i === 2 ? "topic" : "organisation",
    frequency: i === 2 ? "10m" : "20m",
    is_active: true,
    mention_count: [4821, 2341, 1203, 832][i],
    latest_scan: { status: "success", items_new: [342, 84, 216, 19][i] },
    last_scan_at: stamp(i + 1),
  }));
  const alerts = [
    "342 new mentions detected for MTN Nigeria",
    "Network outage is trending",
    "New article detected from a major source",
  ].map((title, i) => ({
    id: `alert-${i}`,
    title,
    body: [
      "Most new mentions relate to network performance in Lagos.",
      "Discussion volume is higher than the normal twenty-minute baseline.",
      "TechCabal published a report about MTN infrastructure plans.",
    ][i],
    severity: i === 2 ? "normal" : "high",
    read_at: null,
    created_at: stamp(i + 2),
    mention_id: mentions[i].id,
    cluster_id: clusters[i].id,
    monitor: monitors[0],
  }));
  const store = {
    sources,
    mentions,
    clusters,
    monitors,
    alerts,
    preferences: {},
    defaults: {
      frequency: "20m",
      history_days: 30,
      include_related_terms: true,
    },
    notifications: {
      digest_cadence: "20m",
      digest_hour: 9,
      channels: { in_app: true, email: false, web_push: false },
      alerts: { velocity: true, high_authority: true, high_relevance: true },
      quiet_hours: null,
      email_available: true,
    },
    account: {
      id: "demo",
      name: "Ada Okafor",
      locale: "en",
      timezone: "Africa/Lagos",
    },
    saved: [],
  };
  return {
    store,
    async call(path, { method = "GET", body } = {}) {
      const url = new URL(path, "https://demo.invalid");
      const p = url.pathname;
      if (p === "/auth/me") {
        if (method === "PATCH") Object.assign(store.account, body);
        return { user: store.account, data: store.account };
      }
      if (p === "/sources")
        return { data: store.sources.map((source) => ({ source, ...source })) };
      if (p === "/search") {
        let data = store.mentions;
        const q = url.searchParams;
        for (const key of [
          "sentiment",
          "language",
          "country_code",
          "source_id",
          "cluster_id",
        ])
          if (q.get(key))
            data = data.filter((item) => item[key] === q.get(key));
        if (q.get("from"))
          data = data.filter((item) => item.published_at >= q.get("from"));
        if (q.get("sort") === "latest")
          data = [...data].sort((a, b) =>
            b.published_at.localeCompare(a.published_at),
          );
        return { data };
      }
      if (p.startsWith("/mentions/")) {
        const data = store.mentions.find((item) => item.id === p.split("/")[2]);
        return {
          data: {
            ...data,
            cluster: store.clusters.find(
              (item) => item.id === data?.cluster_id,
            ),
          },
        };
      }
      if (p.endsWith("/mentions") && p.startsWith("/clusters/"))
        return {
          data: store.mentions.filter(
            (item) => item.cluster_id === p.split("/")[2],
          ),
        };
      if (p.startsWith("/clusters/"))
        return {
          data: store.clusters.find((item) => item.id === p.split("/")[2]),
        };
      if (p === "/explore" || p === "/intelligence/most-mentioned")
        return {
          data: p.endsWith("most-mentioned")
            ? [...store.clusters].sort(
                (a, b) => b.mention_count - a.mention_count,
              )
            : store.clusters,
          meta: { last_page: 1, total: store.clusters.length },
        };
      if (p === "/intelligence/trending" || p === "/intelligence/emerging")
        return {
          data: store.clusters.filter((_, i) =>
            p.endsWith("emerging") ? i > 1 : i < 3,
          ),
        };
      if (p === "/intelligence/geography")
        return {
          data: [
            { location: "Lagos", count: 36 },
            { location: "Abuja", count: 23 },
            { location: "Port Harcourt", count: 14 },
            { location: "Other Nigeria", count: 27 },
          ],
        };
      if (p.startsWith("/analytics/"))
        return { demoAnalytics: ANALYTICS_DATA["7 days"] };
      if (p === "/alerts/read-all") {
        store.alerts = store.alerts.map((item) => ({
          ...item,
          read_at: stamp(),
        }));
        return { updated: store.alerts.length };
      }
      if (p.startsWith("/alerts/")) {
        const item = store.alerts.find((item) => item.id === p.split("/")[2]);
        if (item && method === "PATCH") item.read_at = stamp();
        return { data: item };
      }
      if (p === "/alerts")
        return {
          data: store.alerts,
          meta: { next_cursor: null, prev_cursor: null },
        };
      if (p === "/settings/notifications") {
        if (method === "PATCH") {
          for (const key of ["digest_cadence", "digest_hour"])
            if (key in body) store.notifications[key] = body[key];
          for (const key of ["velocity", "high_authority", "high_relevance"])
            if (`notify_${key}` in body)
              store.notifications.alerts[key] = body[`notify_${key}`];
          for (const key of ["email", "web_push"])
            if (`channel_${key}` in body)
              store.notifications.channels[key] = body[`channel_${key}`];
        }
        return store.notifications;
      }
      if (p === "/settings/monitoring-defaults") {
        if (method === "PATCH") Object.assign(store.defaults, body);
        return { data: store.defaults };
      }
      if (p === "/settings/sources") {
        if (method === "PATCH")
          for (const update of body.sources) {
            const source = store.sources.find((s) => s.id === update.source_id);
            if (source) source.enabled_for_workspace = update.enabled;
          }
        return { data: store.sources };
      }
      if (p.includes("/preferences")) {
        const id = p.split("/")[2];
        if (method === "PATCH")
          store.preferences[id] = { ...store.preferences[id], ...body };
        return { data: store.preferences[id] || null };
      }
      if (p === "/saved-searches") {
        if (method === "POST") {
          const item = { id: crypto.randomUUID(), ...body };
          store.saved.push(item);
          return { data: item };
        }
        return { data: store.saved };
      }
      throw new Error("This action is not available in the demo workspace.");
    },
  };
}
