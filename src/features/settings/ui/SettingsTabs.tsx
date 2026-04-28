import type { SettingsTabId } from "../../../shared/types";

const tabs = [
  { id: "account", label: "계정" },
  { id: "notifications", label: "알림" },
  { id: "display", label: "화면" },
  { id: "email", label: "이메일 연동" },
  { id: "support", label: "관리자 문의" },
] as const satisfies ReadonlyArray<{ id: SettingsTabId; label: string }>;

interface SettingsTabsProps {
  activeTab: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
}

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  return (
    <div className="mb-6 border-b border-border">
      <div className="flex flex-wrap gap-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`border-b-2 pb-3 text-sm transition ${
              activeTab === tab.id
                ? "border-[#2DD4BF] text-[#0F766E] dark:border-[#115E59] dark:text-[#5EEAD4]"
                : "border-transparent text-slate-400 dark:text-muted-foreground"
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
