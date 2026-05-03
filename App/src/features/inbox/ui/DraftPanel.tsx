import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, CheckCircle2, FileText, Loader2, PencilLine, Send, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { emailStatusMeta } from "../../../entities/email/model/email-data";
import type { EmailItem, EmailRecommendationItem, EmailStatus } from "../../../shared/types";
import { AiUsageBadge } from "../../../shared/ui/primitives/AiUsageBadge";
import { StatePanel } from "../../../shared/ui/primitives/StatePanel";
import {
  getTemplateLibrary,
  type TemplateSnapshot,
} from "../../../shared/api/templates";
import { getErrorMessage } from "../../../shared/api/http";

const metaByStatus = emailStatusMeta as Record<
  EmailStatus,
  { label: string; tone: string; banner: string }
>;

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

  return { auto: 0, required: tokens.length };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderAutoCompletedText(text: string, autoCompletedValues: Record<string, string>) {
  const entries = Object.entries(autoCompletedValues)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length >= 2)
    .sort((left, right) => right[1].length - left[1].length)
    .slice(0, 12);

  if (!entries.length) {
    return <span>{text}</span>;
  }

  const pattern = new RegExp(`(${entries.map(([, value]) => escapeRegExp(value)).join("|")})`, "g");
  const labelByValue = new Map(entries.map(([key, value]) => [value, key]));

  return text.split(pattern).map((part, index) => {
    const key = labelByValue.get(part);
    if (!key) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <span
        key={`${part}-${index}`}
        title={`${key} 자동완성`}
        className="rounded-md bg-[#E6FAF8] px-1.5 py-0.5 text-[#0F766E] dark:bg-[#0B2728] dark:text-[#5EEAD4]"
      >
        {part}
      </span>
    );
  });
}

function renderDraftText(
  text: string,
  highlight: boolean,
  autoCompletedValues: Record<string, string> = {},
) {
  return text.split(/({{[^}]+}})/).map((part: string, index: number) => {
    if (!part.startsWith("{{") || !part.endsWith("}}")) {
      return (
        <span key={`${part}-${index}`}>
          {highlight ? renderAutoCompletedText(part, autoCompletedValues) : part}
        </span>
      );
    }

    if (!highlight) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <span
        key={`${part}-${index}`}
        className="rounded-md bg-[#FEF3C7] px-1.5 py-0.5 text-[#D97706] dark:bg-[#2A1D10] dark:text-[#F4C98A]"
      >
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
  onSelectRecommendation?: (recommendation: EmailRecommendationItem) => void;
  onDraftChange?: (content: string) => void;
  onDraftSubjectChange?: (subject: string) => void;
  onStartEditDraft?: () => void;
  onStartManualReply?: () => void;
  onCancelDraftEdit?: () => void;
  onSaveDraftEdit?: () => void;
  onLoadLibraryTemplate?: (template: TemplateSnapshot) => void;
}

export function DraftPanel({
  email,
  onSend,
  onEditSend,
  onSkip,
  onSelectRecommendation,
  onDraftChange,
  onDraftSubjectChange,
  onStartEditDraft,
  onStartManualReply,
  onCancelDraftEdit,
  onSaveDraftEdit,
  onLoadLibraryTemplate,
}: DraftPanelProps) {
  const navigate = useNavigate();
  const [libraryTemplates, setLibraryTemplates] = useState<TemplateSnapshot[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePickerLoading, setTemplatePickerLoading] = useState(false);
  const [templatePickerError, setTemplatePickerError] = useState<string | null>(null);
  const emailCategory = email?.category ?? "";
  const manualTemplateOptions = useMemo(() => {
    const normalizedCategory = emailCategory.trim();

    return [...libraryTemplates].sort((left, right) => {
      const leftMatched = left.categoryName === normalizedCategory ? 0 : 1;
      const rightMatched = right.categoryName === normalizedCategory ? 0 : 1;

      if (leftMatched !== rightMatched) {
        return leftMatched - rightMatched;
      }

      return left.title.localeCompare(right.title, "ko");
    });
  }, [emailCategory, libraryTemplates]);

  useEffect(() => {
    if (!templatePickerOpen || libraryTemplates.length || templatePickerLoading) {
      return;
    }

    let active = true;

    setTemplatePickerLoading(true);
    setTemplatePickerError(null);

    void getTemplateLibrary()
      .then((templates) => {
        if (!active) {
          return;
        }

        setLibraryTemplates(templates);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setTemplatePickerError(
          getErrorMessage(error, "템플릿 라이브러리를 불러오지 못했습니다."),
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setTemplatePickerLoading(false);
      });

    return () => {
      active = false;
    };
  }, [libraryTemplates.length, templatePickerLoading, templatePickerOpen]);

  if (!email) {
    return null;
  }

  const recommendations = email.recommendations ?? [];
  const recommendationState = email.recommendationState ?? "idle";
  const templateName = email.templateName || recommendations[0]?.templateTitle || "";
  const handleOpenTemplate = () => {
    const selectedRecommendation = recommendations.find(
      (recommendation) => recommendation.draftId === email.selectedRecommendationId,
    );
    const templateId = selectedRecommendation?.templateId ?? email.selectedTemplateId;
    const searchParams = new URLSearchParams();

    if (templateId != null) {
      searchParams.set("template_id", String(templateId));
    }

    navigate(
      {
        pathname: "/app/templates",
        search: searchParams.toString(),
      },
      {
        state: {
          templateId,
          templateName,
          emailCategory: email.category,
        },
      },
    );
  };

  const meta = metaByStatus[email.status];
  const readonly = email.status !== "pending";
  const tokenCounts = getVariableCounts(email.draft);
  const isEditingDraft = Boolean(email.isDraftEditing || email.isManualDraft);
  const canUseDraftActions = !readonly && Boolean(email.draft.trim() || email.isManualDraft);
  const counts = {
    auto: email.autoCompletedCount ?? tokenCounts.auto,
    required: email.requiredInputCount ?? tokenCounts.required,
  };
  const showDraftFallbackState = !readonly && !email.draft.trim() && !email.isManualDraft;

  const handleLoadLibraryTemplate = (template: TemplateSnapshot) => {
    if (onLoadLibraryTemplate) {
      onLoadLibraryTemplate(template);
    } else {
      onDraftSubjectChange?.(template.subjectTemplate);
      onDraftChange?.(template.bodyTemplate);
    }

    setTemplatePickerOpen(false);
    toast.success("템플릿을 답장 작성 영역으로 불러왔습니다.");
  };

  const manualReplyButton = (
    <button
      type="button"
      className="app-secondary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
      onClick={() => {
        if (onStartManualReply) {
          onStartManualReply();
          return;
        }
        toast("직접 답장 작성 모드로 전환합니다.");
      }}
    >
      <PencilLine className="h-4 w-4" />
      직접 답장 작성
    </button>
  );

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
                email.selectedRecommendationId === recommendation.draftId ||
                (
                  email.selectedRecommendationId == null &&
                  recommendation.templateTitle === templateName &&
                  recommendation.subject === (email.draftSubject || `Re: ${email.subject}`)
                );

              return (
                <button
                  type="button"
                  key={`${recommendation.draftId}-${index}`}
                  onClick={() => onSelectRecommendation?.(recommendation)}
                  className={`rounded-xl border px-3 py-3 ${
                    isPrimary
                      ? "border-[#14B8A6] bg-[#F0FDFA] dark:border-[#5EEAD4] dark:bg-[#0B2728]"
                      : "border-border bg-muted/30"
                  } w-full text-left transition hover:border-[#14B8A6] hover:bg-[#F0FDFA] dark:hover:border-[#5EEAD4] dark:hover:bg-[#0B2728]`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-[#1E2A3A] dark:text-foreground">
                          {recommendation.templateTitle}
                        </p>
                        {isPrimary ? (
                          <span className="rounded-full bg-[#CCFBF1] px-2 py-0.5 text-[10px] font-semibold text-[#0F766E] dark:bg-[#134E4A] dark:text-[#99F6E4]">
                            선택됨
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-[#64748B] dark:text-muted-foreground">
                        {recommendation.subject}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#0F766E] dark:bg-card dark:text-[#5EEAD4]">
                      {similarityLabel}
                    </span>
                  </div>
                </button>
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
          <div>
            <TemplateMatchingPanel
              title="템플릿을 매칭 중입니다"
              description="AI 분석과 RAG 인덱스 결과가 준비되면 추천 템플릿을 자동으로 표시합니다."
              className="mt-4 min-h-[240px]"
            />
            <div className="mt-4">{manualReplyButton}</div>
          </div>
        ) : recommendationState === "error" ? (
          <div>
            <StatePanel
              title="추천 템플릿을 불러오지 못했습니다"
              description={email.recommendationError || "RAG 추천 결과를 확인하는 중 오류가 발생했습니다."}
              tone="error"
              className="mt-4 min-h-[240px]"
            />
            <div className="mt-4">{manualReplyButton}</div>
          </div>
        ) : recommendationState === "empty" ? (
          <div>
            <TemplateMatchingPanel
              title="템플릿 매칭을 계속 확인하고 있습니다"
              description="아직 일치 템플릿이 도착하지 않았습니다. 직접 답장을 작성하거나 추천 결과가 도착할 때까지 기다릴 수 있습니다."
              className="mt-4 min-h-[240px]"
            />
            <div className="mt-4">{manualReplyButton}</div>
          </div>
        ) : null
      ) : (
        <div className={`mt-4 rounded-2xl border border-border bg-card ${readonly ? "opacity-85" : ""}`}>
          <div className="space-y-4 border-b border-border px-4 py-4">
            {email.isManualDraft && isEditingDraft && !readonly ? (
              <div className="rounded-xl border border-dashed border-[#BFD8D4] bg-[#F8FFFD] px-3 py-3 dark:border-[#1F4E48] dark:bg-[#082F2D]/25">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E] dark:text-[#5EEAD4]">
                      템플릿 라이브러리
                    </p>
                    <p className="mt-1 text-xs text-[#64748B] dark:text-muted-foreground">
                      직접 작성 중에도 기존 템플릿을 불러와 편집 후 발송할 수 있습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#99F6E4] bg-white px-3 py-2 text-xs font-semibold text-[#0F766E] transition hover:bg-[#F0FDFA] dark:border-[#134E4A] dark:bg-card dark:text-[#5EEAD4] dark:hover:bg-[#0B2728]"
                    onClick={() => setTemplatePickerOpen((current) => !current)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    템플릿 선택
                  </button>
                </div>

                {templatePickerOpen ? (
                  <div className="mt-3 max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {templatePickerLoading ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        템플릿을 불러오고 있습니다.
                      </div>
                    ) : templatePickerError ? (
                      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-3 text-xs text-[#991B1B] dark:border-[#5B2323] dark:bg-[#211314] dark:text-[#FCA5A5]">
                        {templatePickerError}
                      </div>
                    ) : manualTemplateOptions.length ? (
                      manualTemplateOptions.map((template) => (
                        <button
                          key={template.templateId}
                          type="button"
                          className="w-full rounded-lg border border-border bg-card px-3 py-3 text-left transition hover:border-[#14B8A6] hover:bg-[#F0FDFA] dark:hover:border-[#5EEAD4] dark:hover:bg-[#0B2728]"
                          onClick={() => handleLoadLibraryTemplate(template)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1E2A3A] dark:text-foreground">
                                {template.title}
                              </p>
                              <p className="mt-1 truncate text-xs text-[#64748B] dark:text-muted-foreground">
                                {template.subjectTemplate}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] text-[#64748B] dark:bg-[#1E293B] dark:text-muted-foreground">
                              {template.categoryName}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg border border-border bg-card px-3 py-3 text-xs text-muted-foreground">
                        불러올 수 있는 템플릿이 없습니다.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-medium text-[#94A3B8] dark:text-muted-foreground">받는 사람</p>
              <p className="mt-1 text-sm text-[#1E2A3A] dark:text-foreground">
                {email.sender} &lt;{email.senderEmail}&gt;
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#94A3B8] dark:text-muted-foreground">제목</p>
              {isEditingDraft && !readonly ? (
                <input
                  type="text"
                  value={email.draftSubject ?? `Re: ${email.subject}`}
                  onChange={(event) => onDraftSubjectChange?.(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-[#1E2A3A] outline-none transition focus:border-[#14B8A6] dark:text-foreground"
                />
              ) : (
                <p className="mt-1 text-sm text-[#1E2A3A] dark:text-foreground">
                  {email.draftSubject ?? `Re: ${email.subject}`}
                </p>
              )}
            </div>
          </div>

          <div className="px-4 py-4">
            {isEditingDraft && !readonly ? (
              <textarea
                value={email.draft}
                onChange={(event) => onDraftChange?.(event.target.value)}
                placeholder="보낼 답장 내용을 직접 작성하세요."
                rows={14}
                className="min-h-[280px] w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm leading-7 text-[#475569] outline-none transition focus:border-[#14B8A6] dark:text-muted-foreground"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-8 text-[#475569] dark:text-muted-foreground">
                {renderDraftText(email.draft, !readonly, email.autoCompletedValues)}
              </div>
            )}
          </div>
        </div>
      )}

      {readonly || !canUseDraftActions ? null : (
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
              {email.isManualDraft ? "직접 답장 발송" : isEditingDraft ? "수정본 발송" : "발송하기"}
            </button>

            {isEditingDraft ? (
              <>
                <button
                  type="button"
                  className="app-secondary-button inline-flex min-w-[126px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
                  onClick={() => {
                    if (onSaveDraftEdit) {
                      onSaveDraftEdit();
                      return;
                    }
                    toast.success("임시 저장했습니다.");
                  }}
                >
                  임시 저장
                </button>
                <button
                  type="button"
                  className="inline-flex min-w-[126px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-muted dark:text-muted-foreground"
                  onClick={() => {
                    if (onCancelDraftEdit) {
                      onCancelDraftEdit();
                      return;
                    }
                    toast("편집을 취소했습니다.");
                  }}
                >
                  편집 취소
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="app-secondary-button inline-flex min-w-[126px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
                  onClick={() => {
                    if (onStartEditDraft) {
                      onStartEditDraft();
                      return;
                    }
                    toast("초안 편집 모드로 전환합니다.");
                  }}
                >
                  <PencilLine className="h-4 w-4" />
                  편집하기
                </button>
                {!email.isManualDraft ? (
                  <button
                    type="button"
                    className="inline-flex min-w-[142px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:border-[#14B8A6] hover:text-[#0F766E] dark:text-muted-foreground dark:hover:text-[#5EEAD4]"
                    onClick={() => {
                      if (onStartManualReply) {
                        onStartManualReply();
                        return;
                      }
                      toast("직접 답장 작성 모드로 전환합니다.");
                    }}
                  >
                    <PencilLine className="h-4 w-4" />
                    직접 작성
                  </button>
                ) : null}
              </>
            )}
          </div>

          {!email.isManualDraft ? (
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
          ) : null}
        </div>
      )}

      <p className="mt-3 text-xs text-[#94A3B8] dark:text-muted-foreground">{meta.banner}</p>
    </div>
  );
}
