import { safeExternalUrl } from "./format.js";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
export function digestContent(payload) {
  const summaries = [], mentions = [], details = [];
  const visit = (value, depth = 0, kind = "payload") => {
    if (depth > 4 || value == null) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1, kind)); return; }
    if (typeof value === "string") {
      if (value.trim()) {
        if (["summary", "summary_text", "highlights"].includes(kind)) summaries.push(value);
        else details.push({ label: "Included reference", value });
      }
      return;
    }
    if (!object(value)) return;
    const title = value.title ?? value.headline;
    const url = safeExternalUrl(value.url ?? value.link);
    if (typeof title === "string" && title.trim() && (["mentions","top_mentions","articles","items","results"].includes(kind) || url || value.mention_id || value.source)) {
      mentions.push({title, url, id: typeof value.mention_id === "string" ? value.mention_id : url && typeof value.id === "string" ? value.id : null,
        source: typeof value.source === "string" ? value.source : value.source?.name,
        body: typeof value.summary === "string" ? value.summary : typeof value.body === "string" ? value.body : null});
      return;
    }
    for (const key of ["summary", "summary_text", "highlights", "mentions", "top_mentions", "articles", "items", "results"]) if (key in value) visit(value[key], depth + 1, key);
    if (!Object.keys(value).some((key) => ["summary","summary_text","highlights","mentions","top_mentions","articles","items","results"].includes(key))) {
      for (const [key, item] of Object.entries(value)) if ((typeof item === "string" || typeof item === "number") && !/(id|token|key|url)$/i.test(key)) details.push({label:key.replace(/_/g," "), value:String(item)});
    }
  };
  visit(payload);
  return { summaries: [...new Set(summaries)], mentions: mentions.filter((item,index,list)=>list.findIndex((candidate)=>candidate.id ? candidate.id===item.id : candidate.url ? candidate.url===item.url : candidate.title===item.title)===index), details };
}
