import { motion, useReducedMotion } from "framer-motion";
export function PageMotion({ children, className = "" }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -5 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
export function ResourceState({ resource, empty = false, children }) {
  if (resource.loading)
    return (
      <p className="workspace-loading" role="status">
        Loading…
      </p>
    );
  if (resource.error)
    return (
      <div className="load-error" role="alert">
        <span>{resource.error}</span>
        <button className="text-link" onClick={resource.reload}>
          Try again
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="workspace-empty">
        {children || "Nothing here yet. New discoveries will appear here."}
      </div>
    );
  return null;
}
export function Tabs({ items, value, onChange, label }) {
  return (
    <div className="workspace-tabs" role="tablist" aria-label={label}>
      {items.map((item) => {
        const id = typeof item === "string" ? item : item.id;
        return (
          <button
            type="button"
            key={id}
            role="tab"
            tabIndex={value === id ? 0 : -1}
            onKeyDown={(event) => {
              if (
                !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const buttons = [
                ...event.currentTarget.parentElement.querySelectorAll(
                  '[role="tab"]',
                ),
              ];
              const current = buttons.indexOf(event.currentTarget);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (current +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        items.length) %
                      items.length;
              onChange(
                typeof items[next] === "string" ? items[next] : items[next].id,
              );
              buttons[next].focus();
            }}
            aria-selected={value === id}
            className={value === id ? "selected" : ""}
            onClick={() => onChange(id)}
          >
            {typeof item === "string" ? item : item.label}
          </button>
        );
      })}
    </div>
  );
}
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export function Pagination({ page, lastPage, onChange, loading }) {
  return (
    lastPage > 1 && (
      <div className="monitor-pagination">
        <button
          className="outline-button"
          disabled={page <= 1 || loading}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {lastPage}
        </span>
        <button
          className="outline-button"
          disabled={page >= lastPage || loading}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    )
  );
}
