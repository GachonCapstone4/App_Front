import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Unplug, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { EmailAccount } from "../../../shared/types";
import {
  deleteMyIntegration,
  getGoogleAuthorizationUrl,
  getMyIntegrationSafe,
  type IntegrationSnapshot,
} from "../../../shared/api/integrations";
import { getErrorMessage } from "../../../shared/api/http";
import { setConnectedEmails } from "../../../shared/lib/app-session";
import { SectionCard } from "../../../shared/ui/primitives/SectionCard";
import { StateBanner } from "../../../shared/ui/primitives/StateBanner";

interface EmailIntegrationSettingsPanelProps {
  accounts: EmailAccount[];
  scenarioId?: string | null;
  oauthResult?: string | null;
  oauthMessage?: string | null;
  gmailConnected?: string | null;
  calendarConnected?: string | null;
}

type GoogleOAuthPopupMessage = {
  type: "emailassist-google-oauth";
  result: string;
  message: string;
  gmailConnected: string;
  calendarConnected: string;
};

const GOOGLE_OAUTH_STORAGE_KEY = "emailassist-google-oauth-result";
const GOOGLE_OAUTH_POPUP_NAME = "emailassist-google-oauth";

function parseStoredGoogleOAuthResult(value: string | null): GoogleOAuthPopupMessage | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<GoogleOAuthPopupMessage>;

    if (parsed.type !== "emailassist-google-oauth" || typeof parsed.result !== "string") {
      return null;
    }

    return {
      type: "emailassist-google-oauth",
      result: parsed.result,
      message: typeof parsed.message === "string" ? parsed.message : "",
      gmailConnected:
        typeof parsed.gmailConnected === "string" ? parsed.gmailConnected : "false",
      calendarConnected:
        typeof parsed.calendarConnected === "string" ? parsed.calendarConnected : "false",
    };
  } catch {
    return null;
  }
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M3.75 6.5v10.75a1.25 1.25 0 0 0 1.25 1.25h2.1V10.2L12 13.7l4.9-3.5v8.3H19a1.25 1.25 0 0 0 1.25-1.25V6.5l-1.88 1.33L12 12.2 5.63 7.83 3.75 6.5Z"
        fill="#EA4335"
      />
      <path d="M3.75 6.5 5.63 7.83V18.5H5A1.25 1.25 0 0 1 3.75 17.25V6.5Z" fill="#4285F4" />
      <path d="M20.25 6.5v10.75A1.25 1.25 0 0 1 19 18.5h-.63V7.83l1.88-1.33Z" fill="#34A853" />
      <path d="M20.25 6.5v.24L18.37 8.1 12 12.45 5.63 8.1 3.75 6.74V6.5a1.25 1.25 0 0 1 2-.98L12 9.92l6.25-4.4a1.25 1.25 0 0 1 2 .98Z" fill="#FBBC04" />
    </svg>
  );
}

function formatSyncStatus(syncStatus: string) {
  if (syncStatus === "ERROR") {
    return { label: "연동 오류", tone: "error" as const };
  }

  if (syncStatus === "DISCONNECTED") {
    return { label: "연동 해제", tone: "warning" as const };
  }

  return { label: "정상 연결", tone: "info" as const };
}

function formatSyncDate(value: string | null) {
  if (!value) {
    return "동기화 이력 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function EmailIntegrationSettingsPanel({
  accounts,
  scenarioId,
  oauthResult,
  oauthMessage,
  gmailConnected,
  calendarConnected,
}: EmailIntegrationSettingsPanelProps) {
  const useDemoDataMode =
    scenarioId === "settings-demo" || Boolean(scenarioId?.startsWith("settings-"));
  const oauthVerifyNormalScenario = scenarioId === "settings-email-oauth-verify-normal";
  const oauthErrorScenario = scenarioId === "settings-email-oauth-error";
  const [integration, setIntegration] = useState<IntegrationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [popupResult, setPopupResult] = useState<GoogleOAuthPopupMessage | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const bannerResult = popupResult?.result ?? oauthResult;
  const bannerMessage = popupResult?.message ?? oauthMessage;
  const bannerGmailConnected = popupResult?.gmailConnected ?? gmailConnected;
  const bannerCalendarConnected = popupResult?.calendarConnected ?? calendarConnected;
  const popupWindowFeatures = useMemo(
    () => "popup=yes,width=640,height=820,resizable=yes,scrollbars=yes",
    [],
  );

  const handlePopupResult = async (payload: GoogleOAuthPopupMessage) => {
    setPopupResult(payload);

    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.close();
    }
    popupWindowRef.current = null;

    if (payload.result === "success") {
      try {
        await loadIntegration();
        toast.success("Google 계정 연동을 완료했습니다.");
      } catch (error) {
        toast.error(getErrorMessage(error, "연동 상태를 다시 불러오지 못했습니다."));
      }
      return;
    }

    toast.error(payload.message || "Google 계정 연동을 완료하지 못했습니다.");
  };

  const loadIntegration = async () => {
    const nextIntegration = await getMyIntegrationSafe();
    setIntegration(nextIntegration);
    setConnectedEmails(nextIntegration?.connectedEmail ? [nextIntegration.connectedEmail] : []);
  };

  useEffect(() => {
    if (useDemoDataMode) {
      const fallbackAccount = accounts[0];

      if (fallbackAccount) {
        const nextIntegration: IntegrationSnapshot = {
          provider: fallbackAccount.provider,
          connectedEmail: fallbackAccount.email,
          syncStatus: "CONNECTED",
          isGmailConnected: true,
          isCalendarConnected: true,
          lastSyncedAt: "2026-03-02T09:20:00",
        };

        setIntegration(nextIntegration);
        setConnectedEmails([nextIntegration.connectedEmail]);
      } else {
        setIntegration(null);
        setConnectedEmails([]);
      }

      setLoading(false);
      return;
    }

    let mounted = true;

    void loadIntegration()
      .catch((error) => {
        if (!mounted) {
          return;
        }

        toast.error(getErrorMessage(error, "이메일 연동 상태를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!mounted) {
          return;
        }

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [accounts, useDemoDataMode]);

  useEffect(() => {
    if (useDemoDataMode) {
      return;
    }

    const handleMessage = (event: MessageEvent<GoogleOAuthPopupMessage>) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== "emailassist-google-oauth") {
        return;
      }

      void handlePopupResult(event.data);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== GOOGLE_OAUTH_STORAGE_KEY) {
        return;
      }

      const payload = parseStoredGoogleOAuthResult(event.newValue);
      if (!payload) {
        return;
      }

      window.localStorage.removeItem(GOOGLE_OAUTH_STORAGE_KEY);
      void handlePopupResult(payload);
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [useDemoDataMode]);

  useEffect(() => {
    if (useDemoDataMode) {
      return;
    }

    const payload = parseStoredGoogleOAuthResult(
      window.localStorage.getItem(GOOGLE_OAUTH_STORAGE_KEY),
    );

    if (!payload) {
      return;
    }

    window.localStorage.removeItem(GOOGLE_OAUTH_STORAGE_KEY);
    void handlePopupResult(payload);
  }, [useDemoDataMode]);

  const handleRefresh = async () => {
    if (useDemoDataMode) {
      toast.success("데모 모드에서 연동 상태를 새로고침했습니다.");
      return;
    }

    setRefreshing(true);

    try {
      await loadIntegration();
      toast.success("연동 상태를 새로고침했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "연동 상태를 새로고침하지 못했습니다."));
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnect = async () => {
    if (oauthErrorScenario) {
      toast.error("Google 인증 응답을 확인하지 못했습니다.");
      return;
    }

    if (useDemoDataMode) {
      const fallbackAccount = accounts[0];
      const nextIntegration: IntegrationSnapshot = {
        provider: fallbackAccount?.provider ?? "Gmail",
        connectedEmail: fallbackAccount?.email ?? "demo@gmail.com",
        syncStatus: "CONNECTED",
        isGmailConnected: true,
        isCalendarConnected: true,
        lastSyncedAt: new Date().toISOString(),
      };

      setIntegration(nextIntegration);
      setConnectedEmails([nextIntegration.connectedEmail]);
      toast.success("데모 모드에서 Google 계정 연결을 확인했습니다.");
      return;
    }

    try {
      const popup = window.open("", GOOGLE_OAUTH_POPUP_NAME, popupWindowFeatures);

      if (!popup) {
        toast.error("브라우저에서 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.");
        return;
      }

      popupWindowRef.current = popup;
      popup.document.title = "Google 인증을 준비하고 있습니다";
      popup.document.body.innerHTML = `
        <div style="font-family: system-ui, sans-serif; padding: 32px; color: #0f172a; line-height: 1.6;">
          <h1 style="font-size: 18px; margin: 0 0 12px;">Google 인증을 준비하고 있습니다</h1>
          <p style="margin: 0;">잠시 후 Google 로그인 화면으로 이동합니다.</p>
        </div>
      `;

      const authorizationUrl = await getGoogleAuthorizationUrl();
      popup.location.href = authorizationUrl;
      popup.focus();
    } catch (error) {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
      popupWindowRef.current = null;
      toast.error(getErrorMessage(error, "Google 인증을 시작하지 못했습니다."));
    }
  };

  const handleDisconnect = async () => {
    if (useDemoDataMode) {
      setIntegration(null);
      setConnectedEmails([]);
      toast.success("데모 모드에서 계정 연결 해제를 확인했습니다.");
      return;
    }

    setDisconnecting(true);

    try {
      await deleteMyIntegration();
      setIntegration(null);
      setConnectedEmails([]);
      toast.success("Google 계정 연결을 해제했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "계정 연결을 해제하지 못했습니다."));
    } finally {
      setDisconnecting(false);
    }
  };

  const fallbackAccount = accounts[0];
  const syncStatusMeta = integration ? formatSyncStatus(integration.syncStatus) : null;

  return (
    <SectionCard
      title="연결된 이메일 계정"
      action={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
          onClick={() => void handleRefresh()}
          disabled={loading || refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "새로고침 중..." : "새로고침"}</span>
        </button>
      }
    >
      {oauthErrorScenario ? (
        <StateBanner
          title="Google 인증 확인을 완료하지 못했습니다"
          description="OAuth 복귀 응답을 검증하지 못했습니다. 계정 연결을 다시 시도해 주세요."
          tone="error"
          className="mb-5"
        />
      ) : null}
      {bannerResult === "success" ? (
        <StateBanner
          title="Google 계정 연동을 완료했습니다"
          description={`Gmail ${bannerGmailConnected === "true" ? "연결됨" : "미연결"} / Calendar ${
            bannerCalendarConnected === "true" ? "연결됨" : "미연결"
          }`}
          tone="info"
          className="mb-5"
        />
      ) : null}
      {bannerResult === "error" ? (
        <StateBanner
          title="Google 계정 연동을 완료하지 못했습니다"
          description={bannerMessage || "OAuth 처리 중 오류가 발생했습니다. 다시 시도해 주세요."}
          tone="error"
          className="mb-5"
        />
      ) : null}
      {oauthVerifyNormalScenario ? (
        <StateBanner
          title="Google 인증을 시작할 준비가 되었습니다"
          description="계정 연결 버튼을 누르면 백엔드가 발급한 Google OAuth URL로 이동합니다."
          tone="info"
          className="mb-5"
        />
      ) : null}

      <div className="mt-2 rounded-[18px] border border-[#E2E8F0] bg-card px-4 py-4 dark:border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F1F5F9] bg-white shadow-sm dark:border-border dark:bg-[#131D2F]">
              <GmailIcon />
            </div>

            <div>
              <p className="text-base font-medium text-[#0F172A] dark:text-foreground">
                {integration?.connectedEmail ?? fallbackAccount?.email ?? "Google 계정 미연결"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`inline-flex rounded-full px-2 py-1 font-medium ${
                    syncStatusMeta?.tone === "error"
                      ? "bg-[#FEE2E2] text-[#B91C1C]"
                      : syncStatusMeta?.tone === "warning"
                      ? "bg-[#FEF3C7] text-[#B45309]"
                      : "bg-[#E6FAF8] text-[#0F766E]"
                  }`}
                >
                  {syncStatusMeta?.label ?? "미연결"}
                </span>
                <span>
                  Gmail {integration?.isGmailConnected ? "연결됨" : "미연결"} / Calendar{" "}
                  {integration?.isCalendarConnected ? "연결됨" : "미연결"}
                </span>
                <span>최근 동기화: {formatSyncDate(integration?.lastSyncedAt ?? null)}</span>
              </div>
            </div>
          </div>

          {integration ? (
            <button
              type="button"
              className="app-danger-button inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
            >
              <Unplug className="h-4 w-4" />
              <span>{disconnecting ? "해제 중..." : "연결 해제"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="app-cta-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
              onClick={() => void handleConnect()}
              disabled={loading}
            >
              <ExternalLink className="h-4 w-4" />
              <span>Google 계정 연결</span>
            </button>
          )}
        </div>
      </div>

      {!integration && !bannerResult ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Google 계정을 연결하면 인증이 별도 창에서 진행되고, 완료 후 이 이메일 연동 화면으로 돌아옵니다.
        </p>
      ) : null}
    </SectionCard>
  );
}
