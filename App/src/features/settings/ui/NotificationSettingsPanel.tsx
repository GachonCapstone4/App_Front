import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SectionCard } from "../../../shared/ui/primitives/SectionCard";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../../shared/api/notifications";
import { getErrorMessage } from "../../../shared/api/http";
import type { NotificationSettings } from "../../../shared/types";
import { toast } from "sonner";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

function ToggleRow({
  label,
  description,
  checked,
  disabled = false,
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
          aria-pressed={checked}
          disabled={disabled}
          onClick={onToggle}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
            checked ? "bg-[#2DD4BF] dark:bg-[#0F766E]" : "bg-[#CBD5E1] dark:bg-[#334155]"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span
            className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              checked ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

interface NotificationSettingsPanelProps {
  notifications: NotificationSettings;
}

type NotificationToggleKey = Exclude<keyof NotificationSettings, "draftThreshold">;

export function NotificationSettingsPanel({
  notifications,
}: NotificationSettingsPanelProps) {
  const [settings, setSettings] = useState(notifications);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    setIsLoading(true);

    void getNotificationSettings()
      .then((nextSettings) => {
        if (!mounted) {
          return;
        }

        setSettings(nextSettings);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        toast.error(getErrorMessage(error, "알림 설정을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!mounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggle = (key: NotificationToggleKey) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const savedSettings = await updateNotificationSettings(settings);
      setSettings(savedSettings);
      toast.success("알림 설정을 저장했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "알림 설정을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard title="알림 설정">
      {isLoading ? (
        <p className="mb-3 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          저장된 알림 설정을 불러오는 중입니다.
        </p>
      ) : null}
      <div>
        <ToggleRow
          label="새 이메일 수신 알림"
          description="새 이메일이 유입되고 분류까지 완료되면 알림을 보냅니다"
          checked={settings.newEmail}
          disabled={isLoading || isSaving}
          onToggle={() => toggle("newEmail")}
        />
        <ToggleRow
          label="검토 대기 초안 알림"
          description="검토 대기 초안이 N개 이상 쌓이면 알림을 보냅니다"
          checked={settings.draftQueue}
          disabled={isLoading || isSaving}
          onToggle={() => toggle("draftQueue")}
        >
          {settings.draftQueue ? (
            <div className="flex items-center gap-2">
              <input
                value={settings.draftThreshold}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    draftThreshold: Number(event.target.value) || current.draftThreshold,
                  }))
                }
                className="app-form-input h-10 w-20 rounded-xl px-3 text-sm"
                disabled={isLoading || isSaving}
                min={1}
                type="number"
              />
              <span className="text-sm text-muted-foreground">개 이상일 때</span>
            </div>
          ) : null}
        </ToggleRow>
        <ToggleRow
          label="이메일 계정 오류 알림"
          description="이메일 계정 연결이 끊기면 즉시 알림을 보냅니다"
          checked={settings.accountError}
          disabled={isLoading || isSaving}
          onToggle={() => toggle("accountError")}
        />
        <ToggleRow
          label="미분류 이메일 발생 알림"
          description="어떤 카테고리에도 매칭되지 않은 이메일이 쌓이면 알림을 보냅니다"
          checked={settings.unclassified}
          disabled={isLoading || isSaving}
          onToggle={() => toggle("unclassified")}
        />
        <ToggleRow
          label="캘린더 등록 대기 알림"
          description="감지된 일정이 등록 대기 중일 때 알림을 보냅니다"
          checked={settings.calendarQueue}
          disabled={isLoading || isSaving}
          onToggle={() => toggle("calendarQueue")}
        />
        <ToggleRow
          label="자동 발송 성과 요약 알림"
          description="매일 오후 6시에 답장 처리 결과를 요약해서 알림을 보냅니다"
          checked={settings.dailySummary}
          disabled={isLoading || isSaving}
          onToggle={() => toggle("dailySummary")}
        />
        <ToggleRow
          label="자동 발송 실패 알림"
          description="템플릿 항목을 자동으로 채우지 못해 발송이 중단되면 알림을 보냅니다"
          checked={settings.autoSendFailure}
          disabled={isLoading || isSaving}
          onToggle={() => toggle("autoSendFailure")}
        />
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="app-cta-primary rounded-xl px-5 py-2.5 text-sm font-medium"
          disabled={isLoading || isSaving}
          onClick={handleSave}
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </SectionCard>
  );
}
