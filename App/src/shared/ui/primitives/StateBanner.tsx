import type { ReactNode } from "react";
import {
  AlertTriangle,
  CircleAlert,
  CircleDashed,
  ShieldAlert,
} from "lucide-react";

type BannerTone = "error" | "warning" | "info" | "neutral";

interface StateBannerProps {
  title: string;
  description?: string;
  tone?: BannerTone;
  action?: ReactNode;
  className?: string;
}

function getToneStyles(tone: BannerTone) {
  switch (tone) {
    case "warning":
      return {
        wrapper:
          "border-[#FDE68A] bg-[#FFF7ED] text-[#92400E] dark:border-[#4A3417] dark:bg-[#17120D] dark:text-[#F4C98A]",
        description: "text-[#B45309] dark:text-[#E7C18A]",
        icon: AlertTriangle,
      };
    case "info":
      return {
        wrapper:
          "border-[#99F6E4] bg-[#ECFEFF] text-[#0F766E] dark:border-[#134E4A] dark:bg-[#0B1F24] dark:text-[#5EEAD4]",
        description: "text-[#0F766E] dark:text-[#7BE7D8]",
        icon: CircleDashed,
      };
    case "neutral":
      return {
        wrapper:
          "border-border bg-card text-foreground",
        description: "text-muted-foreground",
        icon: CircleAlert,
      };
    case "error":
    default:
      return {
        wrapper:
          "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] dark:border-[#5B2323] dark:bg-[#211314] dark:text-[#FCA5A5]",
        description: "text-[#B91C1C] dark:text-[#F4B4B4]",
        icon: ShieldAlert,
      };
  }
}

export function StateBanner({
  title,
  description,
  tone = "error",
  action,
  className = "",
}: StateBannerProps) {
  const styles = getToneStyles(tone);
  const Icon = styles.icon;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-start sm:justify-between ${styles.wrapper} ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <p className={`mt-1 text-sm ${styles.description}`}>{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
