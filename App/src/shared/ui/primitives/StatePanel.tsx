import type { ReactNode } from "react";
import {
  AlertTriangle,
  CircleSlash,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

type PanelTone = "error" | "warning" | "empty" | "neutral";

interface StatePanelProps {
  title: string;
  description?: string;
  tone?: PanelTone;
  action?: ReactNode;
  className?: string;
}

function getPanelStyles(tone: PanelTone) {
  switch (tone) {
    case "warning":
      return {
        wrapper: "border-[#FDE68A] bg-[#FFF7ED] dark:border-[#4A3417] dark:bg-[#17120D]",
        title: "text-[#92400E] dark:text-[#F4C98A]",
        description: "text-[#B45309] dark:text-[#E7C18A]",
        icon: AlertTriangle,
      };
    case "empty":
      return {
        wrapper: "border-dashed border-border bg-background",
        title: "text-foreground",
        description: "text-muted-foreground",
        icon: CircleSlash,
      };
    case "neutral":
      return {
        wrapper: "border-border bg-card",
        title: "text-foreground",
        description: "text-muted-foreground",
        icon: RefreshCw,
      };
    case "error":
    default:
      return {
        wrapper: "border-[#FECACA] bg-[#FEF2F2] dark:border-[#5B2323] dark:bg-[#211314]",
        title: "text-[#991B1B] dark:text-[#FCA5A5]",
        description: "text-[#B91C1C] dark:text-[#F4B4B4]",
        icon: ShieldAlert,
      };
  }
}

export function StatePanel({
  title,
  description,
  tone = "error",
  action,
  className = "",
}: StatePanelProps) {
  const styles = getPanelStyles(tone);
  const Icon = styles.icon;

  return (
    <div
      className={`flex min-h-[220px] items-center justify-center rounded-2xl border px-6 py-10 text-center ${styles.wrapper} ${className}`.trim()}
    >
      <div className="max-w-[360px]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/70 dark:bg-black/10">
          <Icon className={`h-7 w-7 ${styles.title}`} />
        </div>
        <p className={`mt-4 text-base font-semibold ${styles.title}`}>{title}</p>
        {description ? (
          <p className={`mt-2 text-sm leading-6 ${styles.description}`}>{description}</p>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
