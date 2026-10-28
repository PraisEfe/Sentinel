import { useEffect, useRef, useState } from "react";
import { X, Clock3, ExternalLink } from "lucide-react";
import { useResource, number } from "../../lib/workspace";
import { ResourceState } from "./WorkspaceUI";
import { digestContent } from "../../lib/digest";
const time = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : "Not provided";
export default function DigestDrawer({ alert, onClose, onSelectResult, readError }) {
  const dialog = useRef(null);
  const [cursor, setCursor] = useState("");
  const digests = useResource(`/digests${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { list: true });
  const detail = useResource(`/alerts/${encodeURIComponent(alert.id)}`);
  const digest = digests.data?.data.find((item)=>item.alert_id===alert.id);
  const content = digestContent(digest?.payload);
  const next = digests.data?.next_cursor ?? digests.data?.meta?.next_cursor;
  useEffect(()=>{const node=dialog.current;node.showModal();return()=>node.close();},[]);
  return <dialog ref={dialog} className="result-drawer digest-drawer" aria-labelledby="digest-title" onCancel={(event)=>{event.preventDefault();onClose();}}>
    <div className="drawer-caption"><span>Digest summary</span><button aria-label="Close digest" onClick={onClose}><X size={19}/></button></div>
    <div className="drawer-body">
      <div className="drawer-kicker"><span className="small-badge"><Clock3 size={11}/> {digest?.cadence || "Digest"}</span></div>
      <h2 id="digest-title">{alert.title || "Your digest"}</h2>
      <p className="digest-intro">{detail.data?.data?.body || alert.body || "Updates from your workspace."}</p>
      {readError && <p className="form-error" role="alert">{readError}</p>}
      <ResourceState resource={digests}/>
      {digest && <>
        <div className="digest-metrics"><strong>{number(digest.mention_count)}<small>new mentions</small></strong><div><span>From {time(digest.period_start)}</span><span>To {time(digest.period_end)}</span></div></div>
        <section aria-label="Digest highlights"><h3>Highlights</h3>{content.summaries.length ? content.summaries.map((summary,index)=><p key={index}>{summary}</p>) : <p className="metric-subtitle">A written summary wasn’t included with this digest.</p>}</section>
        <section aria-label="Digest mentions"><h3>Included mentions</h3>
          {content.mentions.length ? content.mentions.map((item,index)=><article className="digest-mention" key={index}>
            <h4>{item.title}</h4>{item.source && <small>{item.source}</small>}{item.body && <p>{item.body}</p>}
            <div>{item.id && <button className="text-link" onClick={()=>{onClose();onSelectResult({kind:"mention",id:item.id});}}>Open result</button>}{item.url && <a className="text-link" href={item.url} target="_blank" rel="noopener noreferrer">Open source <ExternalLink size={12}/></a>}</div>
          </article>) : <p className="metric-subtitle">The service reported {number(digest.mention_count)} mentions but did not include article details in this digest.</p>}
        </section>
        {content.details.length>0 && <section><h3>Digest details</h3><dl>{content.details.map((item,index)=><div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>}
      </>}
      {!digests.loading && !digests.error && !digest && <div className="workspace-empty"><p>The full digest wasn’t included on this page. The alert above is still available.</p>{next && <button className="outline-button" onClick={()=>setCursor(next)}>Load older digests</button>}</div>}
      <button className="outline-button" onClick={onClose}>Back to alerts</button>
    </div>
  </dialog>;
}
