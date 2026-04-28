import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { PageHeader } from "../../shared/ui/primitives/PageHeader";
import { defaultSettingsState } from "../../entities/settings/model/default-settings";
import { SettingsTabs } from "../../features/settings/ui/SettingsTabs";
import { AccountSettingsPanel } from "../../features/settings/ui/AccountSettingsPanel";
import { NotificationSettingsPanel } from "../../features/settings/ui/NotificationSettingsPanel";
import { DisplaySettingsPanel } from "../../features/settings/ui/DisplaySettingsPanel";
import { EmailIntegrationSettingsPanel } from "../../features/settings/ui/EmailIntegrationSettingsPanel";
import { AdminInquirySettingsPanel } from "../../features/settings/ui/AdminInquirySettingsPanel";
import type {
  DisplaySettings,
  SettingsTabId,
} from "../../shared/types";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTab = searchParams.get("tab");
  const googleOAuthResult = searchParams.get("google_oauth");
  const googleOAuthMessage = searchParams.get("message");
  const gmailConnected = searchParams.get("gmail_connected");
  const calendarConnected = searchParams.get("calendar_connected");
  const scenarioId = resolveDemoScenarioId(searchParams.get("scenario"), "settings-demo");
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    (searchTab as SettingsTabId) || (defaultSettingsState.activeTab as SettingsTabId)
  );

  useEffect(() => {
    if (
      searchTab &&
      ["account", "notifications", "display", "email", "support"].includes(searchTab) &&
      searchTab !== activeTab
    ) {
      setActiveTab(searchTab as SettingsTabId);
    }
  }, [activeTab, searchTab]);

  const handleTabChange = (tab: SettingsTabId) => {
    setActiveTab(tab);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("tab", tab);
    setSearchParams(nextSearchParams, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader title="설정" description="계정 및 서비스 환경을 관리합니다" />
      <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === "account" ? (
        <AccountSettingsPanel account={defaultSettingsState.account} scenarioId={scenarioId} />
      ) : null}
      {activeTab === "notifications" ? (
        <NotificationSettingsPanel notifications={defaultSettingsState.notifications} />
      ) : null}
      {activeTab === "display" ? (
        <DisplaySettingsPanel display={defaultSettingsState.display as DisplaySettings} />
      ) : null}
      {activeTab === "email" ? (
        <EmailIntegrationSettingsPanel
          accounts={defaultSettingsState.emailAccounts}
          scenarioId={scenarioId}
          oauthResult={googleOAuthResult}
          oauthMessage={googleOAuthMessage}
          gmailConnected={gmailConnected}
          calendarConnected={calendarConnected}
        />
      ) : null}
      {activeTab === "support" ? <AdminInquirySettingsPanel scenarioId={scenarioId} /> : null}
    </div>
  );
}
