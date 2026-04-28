import type { ReactNode } from "react";
import { useState } from "react";
import { SectionCard } from "../../../shared/ui/primitives/SectionCard";
import type { NotificationSettings } from "../../../shared/types";
import { toast } from "sonner";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  children,
}: ToggleRowProps) {
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex h-6 min-w-[42px] rounded-full p-1 transition ${
            checked ? "bg-[#2DD4BF]" : "bg-[#CBD5E1] dark:bg-[#475569]"
          }`}
        >
          <span className={`h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : ""}`} />
        </button>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

interface NotificationSettingsPanelProps {
  notifications: NotificationSettings;
}

export function NotificationSettingsPanel({
  notifications,
}: NotificationSettingsPanelProps) {
  const [settings, setSettings] = useState(notifications);

  const toggle = (key: keyof NotificationSettings) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <SectionCard title="알림 설정">
      <div>
        <ToggleRow
          label="새 이메일 수신 알림"
          description="새 이메일이 유입되고 분류까지 완료되면 알림을 보냅니다"
          checked={settings.newEmail}
          onToggle={() => toggle("newEmail")}
        />
        <ToggleRow
          label="검토 대기 초안 알림"
          description="검토 대기 초안이 N개 이상 쌓이면 알림을 보냅니다"
          checked={settings.draftQueue}
          onToggle={() => toggle("draftQueue")}
        >
          {settings.draftQueue ? (
            <div className="flex items-center gap-2">
              <input
                value={settings.draftThreshold}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    draftThreshold: Number(event.target.value) || 0,
                  }))
                }
                className="app-form-input h-10 w-20 rounded-xl px-3 text-sm"
              />
              <span className="text-sm text-muted-foreground">개 이상일 때</span>
            </div>
          ) : null}
        </ToggleRow>
        <ToggleRow
          label="이메일 계정 오류 알림"
          description="이메일 계정 연결이 끊기면 즉시 알림을 보냅니다"
          checked={settings.accountError}
          onToggle={() => toggle("accountError")}
        />
        <ToggleRow
          label="미분류 이메일 발생 알림"
          description="어떤 카테고리에도 매칭되지 않은 이메일이 쌓이면 알림을 보냅니다"
          checked={settings.unclassified}
          onToggle={() => toggle("unclassified")}
        />
        <ToggleRow
          label="캘린더 등록 대기 알림"
          description="감지된 일정이 등록 대기 중일 때 알림을 보냅니다"
          checked={settings.calendarQueue}
          onToggle={() => toggle("calendarQueue")}
        />
        <ToggleRow
          label="자동 발송 성과 요약 알림"
          description="매주 자동 발송 결과를 오후 6시에 요약해서 알림을 보냅니다"
          checked={settings.dailySummary}
          onToggle={() => toggle("dailySummary")}
        />
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="app-cta-primary rounded-xl px-5 py-2.5 text-sm font-medium"
          onClick={() => toast.success("알림 설정을 저장했습니다.")}
        >
          저장
        </button>
      </div>
    </SectionCard>
  );
}
