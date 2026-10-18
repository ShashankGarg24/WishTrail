import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

export function EmptyState({
  title = "No results found",
  description = "Try another search or adjust your filters.",
}) {
  return (
    <div className="admin-state">
      <Inbox size={30} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="admin-state" role="alert">
      <AlertCircle size={28} aria-hidden="true" />
      <h3>Something needs another try</h3>
      <p>{message}</p>
      {retry && (
        <button className="admin-button" onClick={retry}>
          <RefreshCw size={15} />
          Try again
        </button>
      )}
    </div>
  );
}
export function Skeleton({ rows = 5, cards = false }) {
  return (
    <div
      role="status"
      aria-label="Loading data"
      className={cards ? "admin-metrics" : "admin-skeleton-list"}
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={`admin-skeleton ${cards ? "admin-skeleton-card" : ""}`}
        />
      ))}
      <span className="sr-only">Loading data</span>
    </div>
  );
}
export function Badge({ children, tone = "" }) {
  return (
    <span className={`admin-badge ${tone ? `admin-badge-${tone}` : ""}`}>
      {children}
    </span>
  );
}
export function Details({ items }) {
  return (
    <dl className="admin-details">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
