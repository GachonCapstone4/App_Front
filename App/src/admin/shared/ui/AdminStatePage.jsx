import { Link } from "react-router";
import { AlertTriangle, CircleSlash, ShieldAlert, Unplug } from "lucide-react";

function getIcon(tone) {
  switch (tone) {
    case "warning":
      return AlertTriangle;
    case "empty":
      return CircleSlash;
    case "permission":
      return ShieldAlert;
    case "error":
    default:
      return Unplug;
  }
}

export function AdminStatePage({
  title,
  description,
  tone = "error",
  action,
}) {
  const Icon = getIcon(tone);

  return (
    <section className="admin-page admin-page--centered">
      <div className="admin-state-page">
        <div className="admin-state-page-icon">
          <Icon size={32} />
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="admin-state-page-actions">
          {action ?? (
            <Link to="/admin" className="admin-button">
              운영 대시보드로 이동
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
