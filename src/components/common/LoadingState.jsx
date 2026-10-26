// Decorative motion is CSS-only so loading does not add JavaScript work.
export default function LoadingState({ label = "Gathering the latest information…", rows = 0, fullPage = false }) {
  return (
    <div className={`sentinel-loading${fullPage ? " sentinel-loading-page" : ""}`} role="status" aria-live="polite" aria-atomic="true">
      <div className="sentinel-loading-heading">
        <span className="sentinel-loading-mark" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="sentinel-loading-label">{label}</span>
      </div>
      <div className="sentinel-loading-track" aria-hidden="true"><span /></div>
      {rows > 0 && (
        <div className="sentinel-loading-skeleton" aria-hidden="true">
          {Array.from({ length: rows }, (_, index) => (
            <div className="sentinel-loading-row" key={index}>
              <span className="sentinel-loading-avatar" />
              <span className="sentinel-loading-lines"><i /><i /></span>
              <span className="sentinel-loading-pill" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
