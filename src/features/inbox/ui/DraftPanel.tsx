import { useNavigate } from "react-router";
import { AlertTriangle, CheckCircle2, FileText, Loader2, PencilLine, Send, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { emailStatusMeta } from "../../../entities/email/model/email-data";
import type { EmailItem, EmailStatus } from "../../../shared/types";
import { AiUsageBadge } from "../../../shared/ui/primitives/AiUsageBadge";
import { StatePanel } from "../../../shared/ui/primitives/StatePanel";

const metaByStatus = emailStatusMeta as Record<
  EmailStatus,
  { label: string; tone: string; banner: string }
>;

const variableTypeByToken: Record<string, "auto" | "required"> = {
  "{{회사명}}": "auto",
  "{{가격}}": "auto",
  "{{할인율}}": "auto",
  "{{미팅일시}}": "auto",
  "{{날짜1}}": "auto",
  "{{시간1}}": "auto",
  "{{날짜2}}": "auto",
  "{{시간2}}": "auto",
  "{{담당자명}}": "required",
};

function getPanelTitle(status: EmailStatus) {
  if (status === "completed") {
    return "발송된 답변 내용";
  }
  if (status === "unsent") {
    return "미발송 답변 내용";
  }
  if (status === "auto-sent") {
    return "자동 발송된 답변 내용";
  }

  return "매칭된 답변 템플릿";
}

function getPanelDescription(status: EmailStatus) {
  if (status !== "pending") {
    return "";
  }

  return "하이라이트된 항목을 확인하고 필요 시 수정 후 발송하세요";
}

function getVariableCounts(text: string) {
  const tokens = text.match(/{{[^}]+}}/g) || [];

  return tokens.reduce(
    (accumulator: { auto: number; required: number }, token: string) => {
      const type = variableTypeByToken[token] || "auto";

      if (type === "required") {
        accumulator.required += 1;
      } else {
        accumulator.auto += 1;
      }

      return accumulator;
    },
    { auto: 0, required: 0 }
  );
}

function renderDraftText(text: string, highlight: boolean) {
  return text.split(/({{[^}]+}})/).map((part: string, index: number) => {
    if (!part.startsWith("{{") || !part.endsWith("}}")) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    if (!highlight) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    const type = variableTypeByToken[part] || "auto";
    const className =
      type === "required"
        ? "rounded-md bg-[#FEF3C7] px-1.5 py-0.5 text-[#D97706] dark:bg-[#2A1D10] dark:text-[#F4C98A]"
        : "rounded-md bg-[#E6FAF8] px-1.5 py-0.5 text-[#0F766E] dark:bg-[#0B2728] dark:text-[#5EEAD4]";

    return (
      <span key={`${part}-${index}`} className={className}>
        {part}
      </span>
    );
  });
}

interface StatusBannerProps {
  status: EmailStatus;
  sentTime: string;
}

function StatusBanner({ status, sentTime }: StatusBannerProps) {
  if (!sentTime) {
    return null;
  }

  if (status === "completed") {
    return (
      <div className="app-success-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        처리 완료 · {sentTime} 발송됨
      </div>
    );
  }

  if (status === "unsent") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-[#FEF2F2] px-3 py-1 text-xs font-medium text-[#B91C1C] dark:bg-[#211314] dark:text-[#F4B4B4]">
        <SkipForward className="h-3.5 w-3.5" />
        미발송 처리 · {sentTime || "읽음 확인"}
      </div>
    );
  }

  if (status === "auto-sent") {
    return (
      <div className="app-success-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
        <Send className="h-3.5 w-3.5" />
        자동 발송됨 · {sentTime}
      </div>
    );
  }

  return null;
}

interface TemplateMatchingPanelProps {
  title: string;
  description: string;
  className?: string;
}

function TemplateMatchingPanel({ title, description, className = "" }: TemplateMatchingPanelProps) {
  return (
    <div
      className={`flex min-h-[220px] items-center justify-center rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-6 py-10 text-center dark:border-[#134E4A] dark:bg-[#0B2728] ${className}`.trim()}
    >
      <div className="max-w-[380px]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-[#0F766E] shadow-sm dark:bg-black/10 dark:text-[#5EEAD4]">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <p className="mt-4 text-base font-semibold text-[#0F766E] dark:text-[#5EEAD4]">{title}</p>
        <p className="mt-2 text-sm leading-6 text-[#0F766E] dark:text-[#B7F4EF]">{description}</p>
      </div>
    </div>
  );
}

interface DraftPanelProps {
  email: EmailItem | null;
  onSend?: () => void;
  onEditSend?: () => void;
  onSkip?: () => void;
}

export function DraftPanel({
  email,
  onSend,
  onEditSend,
  onSkip,
}: DraftPanelProps) {
  const navigate = useNavigate();

  if (!email) {
    return null;
  }

  const handleOpenTemplate = () => {
    navigate("/app/templates", {
      state: {
        templateName,
        emailCategory: email.category,
      },
    });
  };

  const meta = metaByStatus[email.status];
  const readonly = email.status !== "pending";
  const recommendations = email.recommendations ?? [];
  const recommendationState = email.recommendationState ?? "idle";
  const templateName = email.templateName || recommendations[0]?.templateTitle || "";
  const tokenCounts = getVariableCounts(email.draft);
  const counts = {
    auto: email.autoCompletedCount ?? tokenCounts.auto,
    required: email.requiredInputCount ?? tokenCounts.required,
  };
  const showDraftFallbackState = !readonly && !email.draft.trim();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#CCFBF1] text-[#0F766E] dark:bg-[#0B2728] dark:text-[#5EEAD4]">
          <FileText className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-[#1E2A3A] dark:text-foreground">{getPanelTitle(email.status)}</p>
            <AiUsageBadge label="AI 초안" />
          </div>
          {getPanelDescription(email.status) ? (
            <p className="mt-1 text-xs text-[#94A3B8] dark:text-muted-foreground">
              {getPanelDescription(email.status)}. 초안은 AI 분석과 템플릿 매칭 결과를 바탕으로 제안됩니다.
            </p>
          ) : null}
        </div>
      </div>

      <div className="app-soft-panel rounded-xl px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-[#94A3B8] dark:text-muted-foreground" />
            <span className="truncate text-xs text-[#64748B] dark:text-muted-foreground">
              {templateName || "연결된 템플릿 없음"}
            </span>
          </div>
          {templateName ? (
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-[#14B8A6] dark:text-[#5EEAD4]"
              onClick={handleOpenTemplate}
            >
              템플릿 보기 →
            </button>
          ) : null}
        </div>
      </div>

      {recommendations.length ? (
        <div className="mt-3 rounded-xl border border-border bg-card px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8] dark:text-muted-foreground">
              추천 템플릿
            </p>
            <AiUsageBadge label="AI/RAG 매칭" />
          </div>
          <div className="mt-3 space-y-2">
            {recommendations.map((recommendation, index) => {
              const similarityLabel = `${Math.round(recommendation.similarity * 100)}%`;
              const isPrimary =
                recommendation.templateTitle === templateName &&
                recommendation.subject === (email.draftSubject || `Re: ${email.subject}`);

              return (
                <div
                  key={`${recommendation.draftId}-${index}`}
                  className={`rounded-xl border px-3 py-3 ${
                    isPrimary
                      ? "border-[#14B8A6] bg-[#F0FDFA] dark:border-[#5EEAD4] dark:bg-[#0B2728]"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1E2A3A] dark:text-foreground">
                        {recommendation.templateTitle}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#64748B] dark:text-muted-foreground">
                        {recommendation.subject}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#0F766E] dark:bg-card dark:text-[#5EEAD4]">
                      {similarityLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {readonly ? (
        <div className="mt-4">
          <StatusBanner status={email.status} sentTime={email.sentTime} />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-y border-border py-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[#14B8A6] dark:text-[#5EEAD4]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            자동 완성 {counts.auto}개
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#F59E0B] dark:text-[#F4C98A]">
            <AlertTriangle className="h-3.5 w-3.5" />
            입력 필요 {counts.required}개
          </span>
        </div>
      )}

      {showDraftFallbackState ? (
        recommendationState === "loading" || recommendationState === "idle" ? (
          <TemplateMatchingPanel
            title="템플릿을 매칭 중입니다"
            description="AI 분석과 RAG 인덱스 결과가 준비되면 추천 템플릿을 자동으로 표시합니다."
            className="mt-4 min-h-[280px]"
          />
        ) : recommendationState === "error" ? (
          <StatePanel
            title="추천 템플릿을 불러오지 못했습니다"
            description={email.recommendationError || "RAG 추천 결과를 확인하는 중 오류가 발생했습니다."}
            tone="error"
            className="mt-4 min-h-[280px]"
          />
        ) : recommendationState === "empty" ? (
          <TemplateMatchingPanel
            title="템플릿 매칭을 계속 확인하고 있습니다"
            description="아직 일치 템플릿이 도착하지 않았습니다. 결과가 들어오면 이 영역이 자동으로 갱신됩니다."
            className="mt-4 min-h-[280px]"
          />
        ) : null
      ) : (
        <div className={`mt-4 rounded-2xl border border-border bg-card ${readonly ? "opacity-85" : ""}`}>
          <div className="space-y-4 border-b border-border px-4 py-4">
            <div>
              <p className="text-[11px] font-medium text-[#94A3B8] dark:text-muted-foreground">받는 사람</p>
              <p className="mt-1 text-sm text-[#1E2A3A] dark:text-foreground">
                {email.sender} &lt;{email.senderEmail}&gt;
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#94A3B8] dark:text-muted-foreground">제목</p>
              <p className="mt-1 text-sm text-[#1E2A3A] dark:text-foreground">
                {email.draftSubject || `Re: ${email.subject}`}
              </p>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="whitespace-pre-wrap text-sm leading-8 text-[#475569] dark:text-muted-foreground">
              {renderDraftText(email.draft, !readonly)}
            </div>
          </div>
        </div>
      )}

      {readonly ? null : (
        <div className="mt-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="app-cta-accent inline-flex min-w-[126px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              onClick={() => {
                if (onSend) {
                  onSend();
                  return;
                }
                toast.success("답변을 발송했습니다.");
              }}
            >
              <Send className="h-4 w-4" />
              발송하기
            </button>

            <button
              type="button"
              className="app-secondary-button inline-flex min-w-[126px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              onClick={() => {
                if (onEditSend) {
                  onEditSend();
                  return;
                }
                toast.success("초안을 검토 후 발송했습니다.");
              }}
            >
              <PencilLine className="h-4 w-4" />
              편집 후 발송
            </button>
          </div>

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#94A3B8] transition hover:text-[#64748B] dark:text-muted-foreground dark:hover:text-foreground"
            onClick={() => {
              if (onSkip) {
                onSkip();
                return;
              }
              toast("이 메일을 건너뛰었습니다.");
            }}
          >
            <SkipForward className="h-4 w-4" />
            건너뛰기
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-[#94A3B8] dark:text-muted-foreground">{meta.banner}</p>
    </div>
  );
}
