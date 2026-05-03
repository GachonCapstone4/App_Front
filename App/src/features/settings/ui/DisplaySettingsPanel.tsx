import { useEffect, useState } from "react";
import { GripVertical, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import type { DisplaySettings, DisplayWidget } from "../../../shared/types";
import { toast } from "sonner";
import {
  getDisplaySettings,
  updateDisplaySettings,
} from "../../../shared/api/display-settings";
import { getErrorMessage } from "../../../shared/api/http";

interface WidgetToggleProps {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

function WidgetToggle({ checked, disabled = false, onToggle }: WidgetToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition ${
        checked ? "bg-[#2DD4BF] dark:bg-[#0F766E]" : "bg-[#CBD5E1] dark:bg-[#334155]"
      } disabled:cursor-not-allowed disabled:opacity-60`}
      onClick={onToggle}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

interface DisplaySettingsPanelProps {
  display: DisplaySettings;
}

export function DisplaySettingsPanel({ display }: DisplaySettingsPanelProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [widgets, setWidgets] = useState<DisplayWidget[]>(display.widgets);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let mounted = true;

    setLoadingSettings(true);
    setSettingsError("");

    void getDisplaySettings(display)
      .then((settings) => {
        if (!mounted) {
          return;
        }

        setWidgets(settings.widgets);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setWidgets(display.widgets);
        setSettingsError(getErrorMessage(error, "화면 설정을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!mounted) {
          return;
        }

        setLoadingSettings(false);
      });

    return () => {
      mounted = false;
    };
  }, [display]);

  const handleSave = async () => {
    setSavingSettings(true);
    setSettingsError("");

    try {
      const savedSettings = await updateDisplaySettings(
        {
          ...display,
          theme: currentTheme,
          widgets,
        },
        display,
      );

      setWidgets(savedSettings.widgets);
      toast.success("화면 설정을 저장했습니다.");
    } catch (error) {
      setSettingsError(getErrorMessage(error, "화면 설정 저장에 실패했습니다."));
      toast.error("화면 설정 저장에 실패했습니다.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-border bg-card px-5 py-6 shadow-sm lg:px-6">
        <h2 className="text-xl font-semibold text-foreground">테마</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {["light", "dark"].map((themeOption) => {
            const isActive = currentTheme === themeOption;
            const isLight = themeOption === "light";

            return (
              <button
                key={themeOption}
                type="button"
                aria-pressed={isActive}
                className={`rounded-[18px] border p-4 transition ${
                  isActive
                    ? "border-[#2DD4BF] shadow-[0_0_0_1px_rgba(45,212,191,0.15)] dark:border-[#115E59] dark:shadow-[0_0_0_1px_rgba(15,118,110,0.3)]"
                    : "border-border hover:border-[#CBD5E1] dark:hover:border-[#475569]"
                }`}
                onClick={() => setTheme(themeOption)}
              >
                <div
                  className={`flex h-[112px] items-center justify-center rounded-[14px] border ${
                    isLight
                      ? "border-[#E2E8F0] bg-white dark:border-[#334155] dark:bg-[#131D2F]"
                      : "border-[#223147] bg-[#1E2A3A] dark:border-[#314158] dark:bg-[#08111F]"
                  }`}
                >
                  {isLight ? (
                    <SunMedium className="h-10 w-10 text-[#F59E0B]" />
                  ) : (
                    <Moon className="h-10 w-10 text-[#FBBF24]" />
                  )}
                </div>

                <p className="mt-3 text-center text-sm font-semibold text-[#475569] dark:text-foreground">
                  {isLight ? "라이트" : "다크"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-card px-5 py-6 shadow-sm lg:px-6">
        <h2 className="text-xl font-semibold text-foreground">대시보드 위젯 설정</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          대시보드에 표시할 섹션과 순서를 설정합니다
        </p>
        {settingsError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {settingsError}
          </p>
        ) : null}

        <div className="mt-5 space-y-2.5">
          {widgets.map((widget: DisplayWidget) => (
            <div
              key={widget.id}
              className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-border dark:bg-[#131D2F]"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                <span className="text-sm font-medium text-[#334155] dark:text-foreground">{widget.label}</span>
              </div>

              <WidgetToggle
                checked={widget.visible}
                disabled={loadingSettings || savingSettings}
                onToggle={() =>
                  setWidgets((current: DisplayWidget[]) =>
                    current.map((item: DisplayWidget) =>
                      item.id === widget.id ? { ...item, visible: !item.visible } : item
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="app-cta-primary rounded-xl px-5 py-2.5 text-sm font-medium"
          disabled={loadingSettings || savingSettings}
          onClick={handleSave}
        >
          {savingSettings ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
