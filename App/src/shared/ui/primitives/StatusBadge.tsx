import type { StatusBadgeTone } from "../../types";

const toneMap = {
  warning: "bg-[#FEF3C7] text-[#D97706] dark:bg-[#78350F] dark:text-[#FCD34D]",
  success: "bg-[#D1FAE5] text-[#059669] dark:bg-[#064E3B] dark:text-[#6EE7B7]",
  neutral: "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E293B] dark:text-[#CBD5E1]",
  teal: "bg-[#CCFBF1] text-[#0F766E] dark:bg-[#134E4A] dark:text-[#99F6E4]",
  red: "bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D] dark:text-[#FCA5A5]",
} satisfies Record<StatusBadgeTone, string>;

interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  className?: string;
}

export function StatusBadge({
  label,
  tone = "neutral",
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${toneMap[tone]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
