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
      className={`inline-flex items-center gap-1 rounded-full bg-[#0F766E] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm ring-1 ring-[#0D9488] dark:bg-[#2DD4BF] dark:text-[#042F2E] dark:ring-[#5EEAD4] ${className}`.trim()}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}
