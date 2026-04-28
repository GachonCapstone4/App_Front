import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowRight, CheckCircle2, Lock, Mail, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";
import { completeGoogleSignupAndCreateSession } from "../../shared/api/session";
import { getErrorMessage } from "../../shared/api/http";
import { AuthOnboardingLayout } from "../../shared/ui/AuthOnboardingLayout";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";

const footerItems = [
  {
    icon: Shield,
    text: "Google 인증으로 이메일 소유권을 먼저 확인한 뒤 계정을 생성합니다",
  },
  {
    icon: Mail,
    text: "회원가입에 사용하는 이메일은 인증된 Gmail 주소로 고정됩니다",
  },
  {
    icon: Lock,
    text: "비밀번호는 EmailAssist 로그인용으로만 설정됩니다",
  },
];

const leftPanelContent: { title: ReactNode; subtitle: ReactNode } = {
  title: (
    <>
      Google 인증이
      <br />
      <span className="text-[#7AF2D2]">완료되었습니다</span>
    </>
  ),
  subtitle:
    "인증된 Gmail 정보로 계정을 만들고\n이후 온보딩에서 비즈니스 설정과 AI 템플릿 생성을 진행합니다",
};

export function GoogleSignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tempToken = searchParams.get("temp_token") ?? "";
  const email = searchParams.get("email") ?? "";
  const name = searchParams.get("name") ?? "";
  const error = searchParams.get("error");
  const message = searchParams.get("message");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const invalidSession = !tempToken || !email;

  const banner = useMemo(() => {
    if (error) {
      return {
        tone: "error" as const,
        title: "Google 회원가입을 계속할 수 없습니다",
        description: message || "Google 인증을 다시 진행해 주세요.",
      };
    }

    if (invalidSession) {
      return {
        tone: "warning" as const,
        title: "회원가입 세션이 없습니다",
        description: "로그인 화면에서 Google 계정으로 회원가입을 다시 시작해 주세요.",
      };
    }

    return {
      tone: "info" as const,
      title: "인증된 Google 계정 정보입니다",
      description: "이름과 이메일은 Google 인증 결과로 자동 입력되며 수정할 수 없습니다.",
    };
  }, [error, invalidSession, message]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (invalidSession) {
      toast.error("Google 회원가입을 다시 시작해 주세요.");
      return;
    }

    if (!password.trim() || !passwordConfirm.trim()) {
      toast.error("비밀번호와 비밀번호 확인을 입력해 주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.trim().length < 8) {
      toast.error("비밀번호는 8자 이상으로 입력해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      await completeGoogleSignupAndCreateSession(tempToken, password.trim());
      toast.success("회원가입이 완료되었습니다. 온보딩으로 이동합니다.");
      navigate("/onboarding", { replace: true });
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, "회원가입을 완료하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthOnboardingLayout
      title={leftPanelContent.title}
      subtitle={leftPanelContent.subtitle}
      footerItems={footerItems}
      stepBar={
        <div className="flex items-center gap-2 max-w-[600px]">
          <div className="app-cta-accent flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px]">
              1
            </div>
            <span className="text-[13px] whitespace-nowrap">Google 인증</span>
          </div>
          <div className="hidden h-px w-6 shrink-0 bg-[#CBD5E1] dark:bg-[#334155] sm:block" />
          <div className="app-cta-accent flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px]">
              2
            </div>
            <span className="text-[13px] whitespace-nowrap">비밀번호 설정</span>
          </div>
          <div className="hidden h-px w-6 shrink-0 bg-[#CBD5E1] dark:bg-[#334155] sm:block" />
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#94A3B8] dark:text-muted-foreground">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#CBD5E1] text-[11px] dark:border-[#475569]">
              3
            </div>
            <span className="hidden whitespace-nowrap text-[13px] sm:inline">온보딩</span>
          </div>
        </div>
      }
    >
      <div className="relative rounded-2xl border border-[#E2E8F0]/60 bg-white p-8 shadow-sm dark:border-[#243041] dark:bg-card sm:p-10">
        <div className="mb-8 mx-auto max-w-[460px] text-center">
          <h2 className="mb-2 text-[20px] text-[#1E2A3A] dark:text-foreground">
            인증된 계정으로 회원가입 완료
          </h2>
          <p className="text-[14px] text-[#94A3B8] dark:text-muted-foreground">
            Google에서 확인한 이름과 이메일을 기준으로 계정을 생성합니다
          </p>
        </div>

        <StateBanner
          title={banner.title}
          description={banner.description}
          tone={banner.tone}
          className="mb-6"
        />

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
            이름
            <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
              <UserRound className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
              <input
                type="text"
                value={name}
                disabled
                className="w-full bg-transparent text-[14px] text-[#94A3B8] outline-none dark:text-muted-foreground"
              />
            </div>
          </label>

          <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
            이메일
            <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
              <Mail className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-transparent text-[14px] text-[#94A3B8] outline-none dark:text-muted-foreground"
              />
            </div>
          </label>

          <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
            비밀번호
            <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
              <Lock className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상 비밀번호를 입력하세요"
                disabled={invalidSession}
                className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] disabled:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
              />
            </div>
          </label>

          <label className="mb-2 block text-[13px] text-[#1E2A3A] dark:text-foreground">
            비밀번호 확인
            <div className="app-input-shell mt-2 flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
              <input
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                disabled={invalidSession}
                className="w-full bg-transparent text-[14px] text-[#1E2A3A] outline-none placeholder:text-[#94A3B8] disabled:text-[#94A3B8] dark:text-foreground dark:placeholder:text-muted-foreground"
              />
            </div>
          </label>

          <button
            type="submit"
            className="app-cta-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || invalidSession}
          >
            {submitting ? "회원가입 완료 중..." : "회원가입 완료하고 온보딩으로 이동"}
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="w-full text-center text-[13px] font-medium text-[#0F766E] transition-colors hover:text-[#115E59] dark:text-[#5EEAD4] dark:hover:text-[#99F6E4]"
          >
            로그인 화면으로 돌아가기
          </button>
        </form>
      </div>
    </AuthOnboardingLayout>
  );
}
