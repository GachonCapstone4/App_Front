import { Sparkles } from "lucide-react";

interface AiUsageBadgeProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

export function AiUsageBadge({
  label = "AI 활용",
  className = "",
  compact = false,
}: AiUsageBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#0F766E] font-bold text-white shadow-sm ring-1 ring-[#0D9488] dark:bg-[#2DD4BF] dark:text-[#042F2E] dark:ring-[#5EEAD4] ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      } ${className}`.trim()}
    >
      <Sparkles className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {label}
    </span>
  );
}
