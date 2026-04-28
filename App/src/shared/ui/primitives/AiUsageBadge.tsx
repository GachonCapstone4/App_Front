import { Sparkles } from "lucide-react";

interface AiUsageBadgeProps {
  label?: string;
  className?: string;
}

export function AiUsageBadge({
  label = "AI 활용",
  className = "",
}: AiUsageBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#E6FFFA] px-2.5 py-1 text-[11px] font-semibold text-[#0F766E] ring-1 ring-[#99F6E4] dark:bg-[#0B2728] dark:text-[#99F6E4] dark:ring-[#134E4A] ${className}`.trim()}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}
