export function MetricCard({ label, value, hint, tone = "default" }) {
  const className =
    tone === "accent"
      ? "admin-card admin-card--accent"
      : tone === "warn"
      ? "admin-card admin-card--warn"
      : "admin-card";

  return (
    <article className={className}>
      <p className="admin-card-label">{label}</p>
      <p className="admin-card-value">{value}</p>
      <p className="admin-card-hint">{hint}</p>
    </article>
  );
}
