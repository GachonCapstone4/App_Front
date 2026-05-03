import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { refreshStoredSession } from "../../shared/api/session";
import { setAccessToken } from "../../shared/lib/app-session";
import {
  GOOGLE_OAUTH_POPUP_MARKER_KEY,
  isGoogleOAuthPopupWindow,
} from "../../shared/lib/google-oauth-popup";

type GoogleOAuthPopupMessage = {
  type: "emailassist-google-oauth";
  result: string;
  message: string;
  gmailConnected: string;
  calendarConnected: string;
  tempToken: string;
  email: string;
  name: string;
  token: string;
};

const GOOGLE_OAUTH_STORAGE_KEY = "emailassist-google-oauth-result";
export function GoogleOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const legacyGmailConnected = searchParams.get("gmail");
  const legacyCalendarConnected = searchParams.get("calendar");
  const gmailConnected = searchParams.get("gmail_connected") ?? legacyGmailConnected ?? "false";
  const calendarConnected =
    searchParams.get("calendar_connected") ?? legacyCalendarConnected ?? "false";
  const result =
    searchParams.get("google_oauth") ??
    (gmailConnected === "true" || calendarConnected === "true" ? "success" : "error");
  const message = searchParams.get("message") ?? "";
  const tempToken = searchParams.get("temp_token") ?? "";
  const email = searchParams.get("email") ?? "";
  const name = searchParams.get("name") ?? "";
  const token = searchParams.get("token") ?? "";

  useEffect(() => {
    const payload: GoogleOAuthPopupMessage = {
      type: "emailassist-google-oauth",
      result,
      message,
      gmailConnected,
      calendarConnected,
      tempToken,
      email,
      name,
      token,
    };

    const openedAsPopup = isGoogleOAuthPopupWindow() || Boolean(window.opener);

    if (openedAsPopup) {
      try {
        window.sessionStorage.removeItem(GOOGLE_OAUTH_POPUP_MARKER_KEY);
      } catch {
        // 저장소 접근이 막혀도 OAuth 결과 전달은 localStorage/postMessage로 계속 시도한다.
      }

      window.localStorage.setItem(GOOGLE_OAUTH_STORAGE_KEY, JSON.stringify(payload));

      if (window.opener) {
        try {
          window.opener.postMessage(payload, window.location.origin);
        } catch {
          // opener 접근이 COOP 정책으로 차단되면 localStorage 이벤트로 원래 창에 전달한다.
        }
      }

      const closeTimer = window.setInterval(() => {
        window.close();
      }, 250);
      window.close();

      return () => {
        window.clearInterval(closeTimer);
      };
    }

    const timer = window.setTimeout(() => {
      if (result === "pending_registration") {
        const nextSearchParams = new URLSearchParams();
        nextSearchParams.set("temp_token", tempToken);
        nextSearchParams.set("email", email);
        nextSearchParams.set("name", name);
        navigate(`/auth/google/register?${nextSearchParams.toString()}`, {
          replace: true,
        });
        return;
      }

      if (result === "auto_login") {
        if (!token) {
          navigate("/", { replace: true });
          return;
        }

        setAccessToken(token);
        void refreshStoredSession().then((session) => {
          if (session?.role === "ADMIN") {
            navigate("/admin", { replace: true });
            return;
          }

          navigate(session?.onboardingCompleted ? "/app" : "/onboarding", {
            replace: true,
          });
        });
        return;
      }

      const nextSearchParams = new URLSearchParams();
      nextSearchParams.set("tab", "email");
      nextSearchParams.set("google_oauth", result);
      nextSearchParams.set("gmail_connected", gmailConnected);
      nextSearchParams.set("calendar_connected", calendarConnected);

      if (message) {
        nextSearchParams.set("message", message);
      }

      navigate(`/app/settings?${nextSearchParams.toString()}`, {
        replace: true,
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    calendarConnected,
    email,
    gmailConnected,
    message,
    name,
    navigate,
    result,
    tempToken,
    token,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {result === "success" || result === "pending_registration" || result === "auto_login"
            ? "Google 인증을 완료했습니다"
            : "Google 인증을 완료하지 못했습니다"}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {result === "success"
            ? "잠시 후 이 창이 닫히고, 원래 열어둔 이메일 연동 화면으로 돌아갑니다."
            : result === "pending_registration"
              ? "잠시 후 이 창이 닫히고, 원래 화면에서 비밀번호 설정을 이어갑니다."
              : result === "auto_login"
                ? "잠시 후 이 창이 닫히고, 원래 화면에서 로그인 상태를 확인합니다."
            : message || "잠시 후 원래 화면으로 돌아갑니다."}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          창이 자동으로 닫히지 않으면 이 탭을 닫고 원래 화면으로 돌아가 주세요.
        </p>
      </div>
    </div>
  );
}
