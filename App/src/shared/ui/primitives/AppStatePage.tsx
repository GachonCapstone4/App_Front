import type { ReactNode } from "react";
import {
  AlertTriangle,
  CircleSlash,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { Link } from "react-router";

type AppStatePageTone = "error" | "warning" | "permission" | "empty";

interface AppStatePageProps {
  title: string;
  description: string;
  tone?: AppStatePageTone;
  action?: ReactNode;
}

function getStateIcon(tone: AppStatePageTone) {
  switch (tone) {
    case "warning":
      return AlertTriangle;
    case "permission":
      return ShieldAlert;
    case "empty":
      return CircleSlash;
    case "error":
    default:
      return Unplug;
  }
}

function getToneClasses(tone: AppStatePageTone) {
  switch (tone) {
    case "warning":
      return "border-[#FDE68A] bg-[#FFF7ED] dark:border-[#4A3417] dark:bg-[#17120D]";
    case "permission":
      return "border-[#BFDBFE] bg-[#EFF6FF] dark:border-[#1E3A5F] dark:bg-[#111B29]";
    case "empty":
      return "border-dashed border-border bg-background";
    case "error":
    default:
      return "border-[#FECACA] bg-[#FEF2F2] dark:border-[#5B2323] dark:bg-[#211314]";
  }
}

export function AppStatePage({
  title,
  description,
  tone = "error",
  action,
}: AppStatePageProps) {
  const Icon = getStateIcon(tone);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-[960px] items-center justify-center px-4 py-10">
      <div className={`w-full rounded-[28px] border px-8 py-12 text-center shadow-sm ${getToneClasses(tone)}`}>
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-white/80 dark:bg-black/15">
          <Icon className="h-10 w-10 text-foreground dark:text-foreground" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mx-auto mt-3 max-w-[520px] break-keep text-sm leading-7 text-muted-foreground">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {action ?? (
            <Link
              to="/app"
              className="app-cta-primary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              대시보드로 이동
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
