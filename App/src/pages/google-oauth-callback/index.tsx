import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

type GoogleOAuthPopupMessage = {
  type: "emailassist-google-oauth";
  result: string;
  message: string;
  gmailConnected: string;
  calendarConnected: string;
};

export function GoogleOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const result = searchParams.get("google_oauth") ?? "error";
  const message = searchParams.get("message") ?? "";
  const gmailConnected = searchParams.get("gmail_connected") ?? "false";
  const calendarConnected = searchParams.get("calendar_connected") ?? "false";

  useEffect(() => {
    const payload: GoogleOAuthPopupMessage = {
      type: "emailassist-google-oauth",
      result,
      message,
      gmailConnected,
      calendarConnected,
    };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
      window.close();
      return;
    }

    const timer = window.setTimeout(() => {
      navigate(`/app/settings?tab=email&google_oauth=${encodeURIComponent(result)}`, {
        replace: true,
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [calendarConnected, gmailConnected, message, navigate, result]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {result === "success" ? "Google 인증을 완료했습니다" : "Google 인증을 완료하지 못했습니다"}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {result === "success"
            ? "잠시 후 이 창이 닫히고, 원래 열어둔 이메일 연동 화면으로 돌아갑니다."
            : message || "잠시 후 원래 화면으로 돌아갑니다."}
        </p>
      </div>
    </div>
  );
}
