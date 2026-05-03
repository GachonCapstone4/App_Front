import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Settings,
  Shield,
  UserRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_VPN_CIDR,
  createAuthenticatedSession,
  deriveNameFromEmail,
  setAccessToken,
} from "../../shared/lib/app-session";
import {
  getGoogleSignupAuthorizationUrl,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from "../../shared/api/auth";
import { getErrorMessage } from "../../shared/api/http";
import { loginAndCreateSession, refreshStoredSession } from "../../shared/api/session";
import {
  closeGoogleOAuthPopup,
  consumeStoredGoogleOAuthResult,
  GOOGLE_OAUTH_STORAGE_KEY,
  isGoogleOAuthPopupClosed,
  type GoogleOAuthPopupMessage,
  navigateGoogleOAuthPopup,
  openGoogleOAuthPopup,
  parseStoredGoogleOAuthResult,
} from "../../shared/lib/google-oauth-popup";
import { isDemoModeEnabled } from "../../shared/scenarios/demo-mode";
import { AuthOnboardingLayout } from "../../shared/ui/AuthOnboardingLayout";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";

type AuthMode = "login" | "signup" | "reset";

type LoginForm = {
  email: string;
  password: string;
};

type ResetForm = {
  name: string;
  email: string;
  code: string;
  password: string;
  passwordConfirm: string;
};

const leftPanelContent: Record<
  AuthMode,
  { title: ReactNode; subtitle: ReactNode }
> = {
  login: {
    title: (
      <>
        반복되는 이메일
        <br />
        <span className="text-[#7AF2D2]">AI 에이전트</span>에게 맡기세요
      </>
    ),
    subtitle:
      "EmailAssist AI Agent는\n이메일 분류, 답변 초안 생성, 일정을 자동으로 처리\n반복되는 업무 이메일 처리를 한 흐름으로 정리합니다",
  },
  signup: {
    title: "Google 계정으로\n안전하게 시작하세요",
    subtitle:
      "먼저 Gmail 소유권을 확인하고\n인증된 계정으로 EmailAssist 회원가입을 완료합니다",
  },
  reset: {
    title: "비밀번호를 다시 만들고\n바로 복귀하세요",
    subtitle:
      "가입 이메일로 인증 코드를 받고\n코드 확인 후 새 비밀번호를 설정합니다",
  },
};

const footerItems = [
  {
    icon: Shield,
    text: "Google Workspace와 연결해 업무 이메일 AI Agent를 활성화합니다",
  },
  {
    icon: Zap,
    text: "AI가 메일 분류, 답변 초안 생성, 일정 추출을 한 번에 보조합니다",
  },
  {
    icon: Settings,
    text: "템플릿, 프로필, 자동화 규칙을 조정해 AI 응답 흐름을 운영할 수 있습니다",
  },
];

interface AuthPageProps {
  scenarioId?: string | null;
}

const ADMIN_IP_DENIED_MOCK_CLIENT_IP = "203.0.113.25";

type RuntimeBanner = {
  tone: "error" | "warning" | "info" | "neutral";
  title: string;
  description: string;
};

export function AuthPage({ scenarioId }: AuthPageProps) {
  const navigate = useNavigate();
  const demoMode = isDemoModeEnabled();
  const popupWindowRef = useRef<Window | null>(null);
  const popupClosePollingRef = useRef<number | null>(null);
  const oauthResultHandledRef = useRef(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
  });
  const [resetForm, setResetForm] = useState<ResetForm>({
    name: "",
    email: "",
    code: "",
    password: "",
    passwordConfirm: "",
  });
  const [submittingMode, setSubmittingMode] = useState<AuthMode | null>(null);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCompleted, setResetCompleted] = useState(false);
  const [runtimeBanner, setRuntimeBanner] = useState<RuntimeBanner | null>(
    null,
  );

  const clearPopupClosePolling = () => {
    if (popupClosePollingRef.current !== null) {
      window.clearInterval(popupClosePollingRef.current);
      popupClosePollingRef.current = null;
    }
  };

  const consumePopupResult = () => {
    const payload = consumeStoredGoogleOAuthResult();

    if (payload) {
      void handleGoogleSignupResult(payload);
      return true;
    }

    return false;
  };

  const startPopupClosePolling = () => {
    clearPopupClosePolling();

    popupClosePollingRef.current = window.setInterval(() => {
      const popup = popupWindowRef.current;

      if (!popup || !isGoogleOAuthPopupClosed(popup)) {
        return;
      }

      clearPopupClosePolling();
      popupWindowRef.current = null;

      if (!consumePopupResult()) {
        setSubmittingMode(null);
      }
    }, 700);
  };

  const handleGoogleSignupResult = async (payload: GoogleOAuthPopupMessage) => {
    if (oauthResultHandledRef.current) {
      return;
    }
    oauthResultHandledRef.current = true;
    clearPopupClosePolling();

    closeGoogleOAuthPopup(popupWindowRef.current);
    popupWindowRef.current = null;
    setSubmittingMode(null);

    if (payload.result === "pending_registration") {
      if (!payload.tempToken || !payload.email) {
        setRuntimeBanner({
          tone: "error",
          title: "Google 회원가입 정보를 확인하지 못했습니다",
          description: "Google 회원가입을 다시 시도해 주세요.",
        });
        return;
      }

      const nextSearchParams = new URLSearchParams();
      nextSearchParams.set("temp_token", payload.tempToken);
      nextSearchParams.set("email", payload.email);
      nextSearchParams.set("name", payload.name ?? "");
      navigate(`/auth/google/register?${nextSearchParams.toString()}`);
      return;
    }

    if (payload.result === "auto_login") {
      if (!payload.token) {
        setRuntimeBanner({
          tone: "error",
          title: "자동 로그인 토큰을 확인하지 못했습니다",
          description: "로그인 화면에서 다시 시도해 주세요.",
        });
        return;
      }

      try {
        setAccessToken(payload.token);
        const session = await refreshStoredSession();

        if (session?.role === "ADMIN") {
          navigate("/admin");
          return;
        }

        navigate(session?.onboardingCompleted ? "/app" : "/onboarding");
      } catch (error) {
        setRuntimeBanner({
          tone: "error",
          title: "자동 로그인에 실패했습니다",
          description: getErrorMessage(error, "로그인 화면에서 다시 시도해 주세요."),
        });
      }
      return;
    }

    setRuntimeBanner({
      tone: "error",
      title: "Google 회원가입을 완료하지 못했습니다",
      description: payload.message || "Google 인증을 다시 진행해 주세요.",
    });
  };

  useEffect(() => {
    if (demoMode) {
      return;
    }

    const handleMessage = (event: MessageEvent<GoogleOAuthPopupMessage>) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== "emailassist-google-oauth") {
        return;
      }

      void handleGoogleSignupResult(event.data);
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
      void handleGoogleSignupResult(payload);
    };

    const handleWindowFocus = () => {
      if (consumePopupResult()) {
        return;
      }

      if (
        popupWindowRef.current &&
        isGoogleOAuthPopupClosed(popupWindowRef.current)
      ) {
        clearPopupClosePolling();
        popupWindowRef.current = null;
        setSubmittingMode(null);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleWindowFocus();
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    consumePopupResult();

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearPopupClosePolling();
    };
  }, [demoMode, navigate]);

  const isLogin = mode === "login";
  const isReset = mode === "reset";
  const panelText = leftPanelContent[mode];
  const signupModeScenario = scenarioId === "auth-signup-normal";
  const resetModeScenario = scenarioId === "auth-reset-normal";
  const resetCompleteScenario = scenarioId === "auth-reset-complete-normal";
  const loginValidationScenario = scenarioId === "auth-login-validation";
  const signupValidationScenario = scenarioId === "auth-signup-validation";
  const loginServiceErrorScenario = scenarioId === "auth-login-service-error";
  const adminIpDeniedScenario = scenarioId === "auth-admin-ip-denied";

  useEffect(() => {
    setRuntimeBanner(null);

    if (signupModeScenario) {
      setMode("signup");
      setResetCompleted(false);
      setResetCodeSent(false);
      return;
    }

    if (signupValidationScenario) {
      setMode("signup");
      setResetCompleted(false);
      setResetCodeSent(false);
      return;
    }

    if (loginValidationScenario) {
      setMode("login");
      setResetCompleted(false);
      setResetCodeSent(false);
      setLoginForm({
        email: "hojin@company.com",
        password: "",
      });
      return;
    }

    if (loginServiceErrorScenario) {
      setMode("login");
      setResetCompleted(false);
      setResetCodeSent(false);
      setLoginForm({
        email: "hojin@company.com",
        password: "password123",
      });
      return;
    }

    if (adminIpDeniedScenario) {
      setMode("login");
      setResetCompleted(false);
      setResetCodeSent(false);
      setLoginForm({
        email: "admin@admin",
        password: "admin",
      });
      return;
    }

    if (resetModeScenario) {
      setMode("reset");
      setResetForm({
        name: "김호진",
        email: "hojin@company.com",
        code: "",
        password: "",
        passwordConfirm: "",
      });
      setResetCompleted(false);
      setResetCodeSent(false);
      return;
    }

    if (resetCompleteScenario) {
      setMode("reset");
      setResetForm({
        name: "김호진",
        email: "hojin@company.com",
        code: "123456",
        password: "newPassword123!",
        passwordConfirm: "newPassword123!",
      });
      setResetCompleted(true);
      setResetCodeSent(true);
    }
  }, [
    loginServiceErrorScenario,
    loginValidationScenario,
    adminIpDeniedScenario,
    resetCompleteScenario,
    resetModeScenario,
    signupModeScenario,
    signupValidationScenario,
  ]);

  const bannerContent = useMemo(() => {
    if (loginValidationScenario) {
      return {
        tone: "warning" as const,
        title: "로그인 정보를 모두 입력해 주세요",
        description:
          "문서 캡처용 유효성 오류 상태입니다. 비밀번호가 비어 있어 제출할 수 없습니다.",
      };
    }

    if (signupValidationScenario) {
      return {
        tone: "warning" as const,
        title: "Google 인증이 먼저 필요합니다",
        description:
          "회원가입은 Google 계정 소유권을 확인한 뒤 이름과 이메일을 잠근 상태에서 비밀번호를 설정합니다.",
      };
    }

    if (loginServiceErrorScenario) {
      return {
        tone: "error" as const,
        title: "로그인 처리 중 문제가 발생했습니다",
        description:
          "현재 인증 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    if (adminIpDeniedScenario) {
      return {
        tone: "error" as const,
        title: "관리자 접근이 승인되지 않았습니다",
        description: `현재 접속 IP ${ADMIN_IP_DENIED_MOCK_CLIENT_IP}는 관리자 VPN 허용 대역(${ADMIN_VPN_CIDR})에 포함되지 않습니다. VPN 연결 후 다시 로그인해 주세요.`,
      };
    }

    return runtimeBanner;
  }, [
    adminIpDeniedScenario,
    loginServiceErrorScenario,
    loginValidationScenario,
    runtimeBanner,
    signupValidationScenario,
  ]);

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRuntimeBanner(null);

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    if (loginServiceErrorScenario) {
      toast.error("로그인 요청을 완료하지 못했습니다.");
      return;
    }

    if (adminIpDeniedScenario) {
      setRuntimeBanner({
        tone: "error",
        title: "관리자 접근이 승인되지 않았습니다",
        description: `현재 접속 IP ${ADMIN_IP_DENIED_MOCK_CLIENT_IP}는 관리자 VPN 허용 대역(${ADMIN_VPN_CIDR})에 포함되지 않습니다. VPN 연결 후 다시 로그인해 주세요.`,
      });
      return;
    }

    setSubmittingMode("login");

    try {
      const normalizedEmail = loginForm.email.trim().toLowerCase();
      const session = demoMode
        ? createAuthenticatedSession({
            name: normalizedEmail.startsWith("admin")
              ? "데모 관리자"
              : deriveNameFromEmail(normalizedEmail) || "데모 사용자",
            email: normalizedEmail,
            role: normalizedEmail.startsWith("admin") ? "ADMIN" : "USER",
            onboardingCompleted: normalizedEmail.startsWith("admin"),
            connectedEmail: normalizedEmail.startsWith("admin")
              ? ""
              : "demo@gmail.com",
            connectedEmails: normalizedEmail.startsWith("admin")
              ? []
              : ["demo@gmail.com"],
          })
        : await loginAndCreateSession(
            loginForm.email.trim(),
            loginForm.password.trim(),
          );

      if (session.role === "ADMIN") {
        toast.success("관리자 계정으로 로그인되었습니다.");
        navigate("/admin");
        return;
      }

      if (session.onboardingCompleted) {
        toast.success("로그인되었습니다. 업무 화면으로 이동합니다.");
        navigate("/app");
        return;
      }

      toast.success("로그인되었습니다. 온보딩으로 이동합니다.");
      navigate("/onboarding");
    } catch (error) {
      setRuntimeBanner({
        tone: "error",
        title: "로그인 정보를 다시 확인해 주세요",
        description: getErrorMessage(
          error,
          "로그인 요청을 처리하지 못했습니다.",
        ),
      });
    } finally {
      setSubmittingMode(null);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmittingMode("signup");

    try {
      oauthResultHandledRef.current = false;
      if (demoMode) {
        createAuthenticatedSession({
          name: "데모 사용자",
          email: "demo@gmail.com",
          role: "USER",
          onboardingCompleted: false,
          connectedEmail: "demo@gmail.com",
          connectedEmails: ["demo@gmail.com"],
        });
        toast.success("데모 Google 회원가입이 완료되었습니다. 온보딩으로 이동합니다.");
        navigate("/onboarding");
        return;
      } else {
        const popup = openGoogleOAuthPopup();

        if (!popup) {
          toast.error("브라우저에서 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.");
          return;
        }

        popupWindowRef.current = popup;
        startPopupClosePolling();
        const authorizationUrl = await getGoogleSignupAuthorizationUrl();
        navigateGoogleOAuthPopup(popup, authorizationUrl);
        toast("Google 인증을 마치면 이 화면에서 회원가입을 이어갑니다.");
      }
    } catch (error) {
      clearPopupClosePolling();
      closeGoogleOAuthPopup(popupWindowRef.current);
      popupWindowRef.current = null;
      toast.error(getErrorMessage(error, "Google 회원가입을 시작하지 못했습니다."));
    } finally {
      setSubmittingMode(null);
    }
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRuntimeBanner(null);

    if (!resetForm.name.trim() || !resetForm.email.trim()) {
      toast.error("이름과 이메일을 입력해주세요.");
      return;
    }

    if (!resetCodeSent) {
      if (demoMode) {
        setResetCodeSent(true);
        toast.success("데모 인증 코드 발송 상태를 표시했습니다.");
        return;
      }

      setSubmittingMode("reset");

      try {
        await sendPasswordResetCode(resetForm.name.trim(), resetForm.email.trim());
        setResetCodeSent(true);
        toast.success("인증 코드를 이메일로 발송했습니다.");
      } catch (error) {
        setRuntimeBanner({
          tone: "error",
          title: "인증 코드를 발송하지 못했습니다",
          description: getErrorMessage(
            error,
            "입력한 이름과 이메일을 다시 확인해 주세요.",
          ),
        });
      } finally {
        setSubmittingMode(null);
      }

      return;
    }

    if (
      !resetForm.code.trim() ||
      !resetForm.password.trim() ||
      !resetForm.passwordConfirm.trim()
    ) {
      toast.error("인증 코드와 새 비밀번호를 모두 입력해주세요.");
      return;
    }

    if (resetForm.password !== resetForm.passwordConfirm) {
      toast.error("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (resetForm.password.trim().length < 8) {
      toast.error("새 비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }

    if (demoMode) {
      setResetCompleted(true);
      toast.success("데모 모드에서 비밀번호 재설정 완료 상태를 표시했습니다.");
      return;
    }

    setSubmittingMode("reset");

    try {
      await verifyPasswordResetCode(
        resetForm.email.trim(),
        resetForm.code.trim(),
        resetForm.password.trim(),
      );
      setResetCompleted(true);
      toast.success(
        "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.",
      );
    } catch (error) {
      setRuntimeBanner({
        tone: "error",
        title: "비밀번호를 재설정하지 못했습니다",
        description: getErrorMessage(
          error,
          "입력한 이름과 이메일을 다시 확인해 주세요.",
        ),
      });
    } finally {
      setSubmittingMode(null);
    }
  };

  return (
    <AuthOnboardingLayout
      title={panelText.title}
      subtitle={panelText.subtitle}
      footerItems={footerItems}
      stepBar={
        <div className="flex items-center gap-2 max-w-[600px]">
          <div className="app-cta-accent flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 shrink-0 text-[11px]">
              1
            </div>
            <span className="text-[13px] whitespace-nowrap">로그인</span>
          </div>
          <div className="hidden h-px w-6 shrink-0 bg-[#CBD5E1] dark:bg-[#334155] sm:block" />
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#94A3B8] dark:text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#CBD5E1] dark:border-[#475569] shrink-0 text-[11px]">
              2
            </div>
            <span className="hidden whitespace-nowrap text-[13px] sm:inline">
              온보딩
            </span>
          </div>
          <div className="hidden h-px w-6 shrink-0 bg-[#CBD5E1] dark:bg-[#334155] sm:block" />
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#94A3B8] dark:text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#CBD5E1] dark:border-[#475569] shrink-0 text-[11px]">
              3
            </div>
            <span className="hidden whitespace-nowrap text-[13px] sm:inline">
              시작
            </span>
          </div>
        </div>
      }
    >
      <div className="relative rounded-2xl border border-[#E2E8F0]/60 bg-white p-8 shadow-sm dark:border-[#243041] dark:bg-card sm:p-10">
        <div className="lg:hidden text-center mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E2A3A] dark:bg-[#18263A]">
            <Mail className="w-6 h-6 text-[#2DD4BF]" />
          </div>
          <p className="text-[13px] text-[#94A3B8] dark:text-muted-foreground">
            업무용 이메일 자동화
          </p>
        </div>

        <div className="mb-8 mx-auto max-w-[460px] text-center">
          <h2 className="mb-2 text-[20px] text-[#1E2A3A] dark:text-foreground">
            {isLogin
              ? "계정에 로그인하세요"
              : isReset
                ? "이메일 인증 후 비밀번호를 바꾸세요"
                : "Google 계정으로 먼저 인증하세요"}
          </h2>
          <p className="text-[14px] text-[#94A3B8] dark:text-muted-foreground">
            {isLogin
              ? "로그인 후 일반 사용자는 온보딩으로, 관리자는 운영 콘솔로 이동합니다"
              : isReset
                ? "가입 이메일로 받은 인증 코드를 확인한 뒤 새 비밀번호를 설정합니다"
                : "Google 인증으로 이메일 소유권을 확인한 뒤 비밀번호를 설정합니다"}
          </p>
        </div>

        {bannerContent ? (
          <StateBanner
            title={bannerContent.title}
            description={bannerContent.description}
            tone={bannerContent.tone}
            className="mb-6"
          />
        ) : null}

        {isReset ? (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                setRuntimeBanner(null);
                setMode("login");
                setResetCompleted(false);
                setResetCodeSent(false);
              }}
              className="text-[13px] font-medium text-[#0F766E] transition-colors hover:text-[#115E59] dark:text-[#5EEAD4] dark:hover:text-[#99F6E4]"
            >
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <div className="mb-6 flex rounded-xl bg-[#F8FAFC] p-1 dark:bg-[#111827]">
            <button
              type="button"
              onClick={() => {
                setRuntimeBanner(null);
                setMode("login");
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors ${
                isLogin
                  ? "bg-white text-[#1E2A3A] shadow-sm dark:bg-[#18263A] dark:text-foreground"
                  : "text-[#64748B] hover:text-[#1E2A3A] dark:text-muted-foreground dark:hover:text-foreground"
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setRuntimeBanner(null);
                setMode("signup");
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors ${
                mode === "signup"
                  ? "bg-white text-[#1E2A3A] shadow-sm dark:bg-[#18263A] dark:text-foreground"
                  : "text-[#64748B] hover:text-[#1E2A3A] dark:text-muted-foreground dark:hover:text-foreground"
              }`}
            >
              회원가입
            </button>
          </div>
        )}

        {isLogin ? (
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
              이메일
              <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
                <Mail className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => {
                    setRuntimeBanner(null);
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                  }}
                  placeholder="name@company.com"
                  className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
                />
              </div>
              {loginValidationScenario ? (
                <p className="mt-2 text-[12px] text-[#B45309] dark:text-[#E7C18A]">
                  이메일과 비밀번호를 모두 입력해야 로그인할 수 있습니다.
                </p>
              ) : null}
            </label>

            <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
              비밀번호
              <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
                <Lock className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => {
                    setRuntimeBanner(null);
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }));
                  }}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
                />
              </div>
              {loginValidationScenario ? (
                <p className="mt-2 text-[12px] text-[#B45309] dark:text-[#E7C18A]">
                  비밀번호 입력이 누락되었습니다.
                </p>
              ) : null}
            </label>

            <button
              type="submit"
              className="app-cta-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5"
              disabled={submittingMode === "login"}
            >
              {submittingMode === "login"
                ? "로그인 중..."
                : "로그인하고 계속하기"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setRuntimeBanner(null);
                setMode("reset");
                setResetForm({
                  name: "",
                  email: loginForm.email,
                  code: "",
                  password: "",
                  passwordConfirm: "",
                });
                setResetCodeSent(false);
                setResetCompleted(false);
              }}
              className="w-full text-center text-[13px] font-medium text-[#0F766E] transition-colors hover:text-[#115E59] dark:text-[#5EEAD4] dark:hover:text-[#99F6E4]"
            >
              비밀번호를 잊으셨나요?
            </button>
          </form>
        ) : isReset ? (
          <form className="space-y-4" onSubmit={handleResetSubmit}>
            {!resetCompleted ? (
              <>
                <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
                  이름
                  <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
                    <UserRound className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                    <input
                      type="text"
                      value={resetForm.name}
                      disabled={resetCodeSent}
                      onChange={(event) =>
                        setResetForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="이름을 입력하세요"
                      className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] disabled:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
                  이메일
                  <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
                    <Mail className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                    <input
                      type="email"
                      value={resetForm.email}
                      disabled={resetCodeSent}
                      onChange={(event) =>
                        setResetForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="name@company.com"
                      className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] disabled:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                {resetCodeSent ? (
                  <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
                    인증 코드
                    <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
                      <Shield className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={resetForm.code}
                        onChange={(event) =>
                          setResetForm((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                        placeholder="이메일로 받은 6자리 코드를 입력하세요"
                        className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
                      />
                    </div>
                  </label>
                ) : null}

                {resetCodeSent ? (
                  <>
                    <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
                      새 비밀번호
                      <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
                        <Lock className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                        <input
                          type="password"
                          value={resetForm.password}
                          onChange={(event) =>
                            setResetForm((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          placeholder="8자 이상 새 비밀번호를 입력하세요"
                          className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
                        />
                      </div>
                    </label>

                    <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
                      새 비밀번호 확인
                      <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
                        <CheckCircle2 className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
                        <input
                          type="password"
                          value={resetForm.passwordConfirm}
                          onChange={(event) =>
                            setResetForm((current) => ({
                              ...current,
                              passwordConfirm: event.target.value,
                            }))
                          }
                          placeholder="새 비밀번호를 다시 입력하세요"
                          className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
                        />
                      </div>
                    </label>
                  </>
                ) : null}

                <button
                  type="submit"
                  disabled={submittingMode === "reset"}
                  className="app-cta-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5"
                >
                  {submittingMode === "reset"
                    ? resetCodeSent
                      ? "변경 중..."
                      : "코드 발송 중..."
                    : resetCodeSent
                      ? "인증하고 새 비밀번호 저장"
                      : "인증 코드 이메일로 받기"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-[#CFE8E2] bg-[#F4FBF8] p-5 dark:border-[#1F4B46] dark:bg-[#0F1F1E]">
                <div className="mb-3 flex items-center gap-2 text-[#0F766E] dark:text-[#5EEAD4]">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-[13px] font-semibold">
                    비밀번호를 다시 설정했습니다
                  </p>
                </div>
                <p className="mb-4 text-[12px] leading-6 text-[#64748B] dark:text-muted-foreground">
                  새 비밀번호가 정상적으로 저장되었습니다. 로그인 화면으로
                  돌아가 새 비밀번호로 다시 로그인해 주세요.
                </p>
                <button
                  type="button"
                  className="app-cta-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5"
                  onClick={() => {
                    setRuntimeBanner(null);
                    setMode("login");
                    setResetCompleted(false);
                  }}
                >
                  로그인으로 돌아가기
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <div className="rounded-2xl border border-[#D7EFE9] bg-[#F4FBF8] p-5 dark:border-[#1F4B46] dark:bg-[#0F1F1E]">
              <div className="mb-3 flex items-center gap-2 text-[#0F766E] dark:text-[#5EEAD4]">
                <Shield className="h-4 w-4" />
                <p className="text-[13px] font-semibold">
                  Google 인증 후 계정을 만듭니다
                </p>
              </div>
              <p className="text-[12px] leading-6 text-[#64748B] dark:text-muted-foreground">
                먼저 Google 계정 소유권을 확인합니다. 인증이 끝나면 Google
                프로필의 이름과 Gmail 주소가 자동 입력되며 수정할 수 없습니다.
              </p>
            </div>

            <button
              type="submit"
              className="app-cta-accent flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5"
              disabled={submittingMode === "signup"}
            >
              {submittingMode === "signup"
                ? "Google 인증 준비 중..."
                : "Google 계정으로 회원가입"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </AuthOnboardingLayout>
  );
}
