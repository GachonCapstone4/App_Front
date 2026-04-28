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

export function AdminStateNotice({
  title,
  description,
  tone = "error",
  compact = false,
}) {
  const Icon = getIcon(tone);

  return (
    <div className={compact ? "admin-state admin-state--compact" : "admin-state"}>
      <div className="admin-state-icon">
        <Icon size={compact ? 18 : 24} />
      </div>
      <div>
        <p className="admin-state-title">{title}</p>
        {description ? <p className="admin-state-copy">{description}</p> : null}
      </div>
    </div>
  );
}
