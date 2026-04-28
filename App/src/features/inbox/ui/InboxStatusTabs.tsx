import type { EmailStatus } from "../../../shared/types";

type InboxStatus = "all" | EmailStatus;

interface InboxStatusTabsProps {
  activeStatus: InboxStatus;
  pendingCount: number;
  unsentCount: number;
  onChange: (status: InboxStatus) => void;
}

interface TabDefinition {
  id: InboxStatus;
  label: string;
  badge?: number;
}

export function InboxStatusTabs({
  activeStatus,
  pendingCount,
  unsentCount,
  onChange,
}: InboxStatusTabsProps) {
  const tabs: TabDefinition[] = [
    { id: "all", label: "전체" },
    { id: "pending", label: "대기 중", badge: pendingCount },
    { id: "completed", label: "처리 완료" },
    { id: "unsent", label: "미발송", badge: unsentCount },
    { id: "auto-sent", label: "자동 발송됨" },
  ];

  return (
    <div className="flex flex-wrap gap-5 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`-mb-px inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition ${
            activeStatus === tab.id
              ? "border-[#2DD4BF] text-[#0F766E] dark:border-[#115E59] dark:text-[#5EEAD4]"
              : "border-transparent text-[#94A3B8] hover:text-[#475569] dark:text-muted-foreground dark:hover:text-foreground"
          }`}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          {tab.badge ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#CCFBF1] px-1.5 py-0.5 text-[10px] font-semibold text-[#0F766E] dark:bg-[#0B2728] dark:text-[#5EEAD4]">
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
