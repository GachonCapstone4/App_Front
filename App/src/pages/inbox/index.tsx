import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { EmailListPanel } from "../../features/inbox/ui/EmailListPanel";
import { InboxStatusTabs } from "../../features/inbox/ui/InboxStatusTabs";
import { EmailThreadPanel } from "../../features/inbox/ui/EmailThreadPanel";
import { DraftPanel } from "../../features/inbox/ui/DraftPanel";
import { emailItems } from "../../entities/email/model/email-data";
import type { EmailItem, EmailStatus } from "../../shared/types";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";
import { StatePanel } from "../../shared/ui/primitives/StatePanel";
import {
  editAndSendInboxReply,
  getInboxDetail,
  getInboxList,
  getInboxRecommendations,
  seedInboxTestEmail,
  sendInboxReply,
  skipInboxReply,
} from "../../shared/api/inbox";
import { getErrorMessage } from "../../shared/api/http";
import {
  mapFrontendInboxStatus,
  mapInboxListItem,
  mergeInboxDetail,
  mapInboxRecommendation,
  mergeInboxRecommendations,
} from "../../app/components/inbox.helpers";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

type InboxStatus = "all" | EmailStatus;

function getCurrentTimeLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

export function InboxPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = resolveDemoScenarioId(searchParams.get("scenario"), "inbox-demo");
  const emptyScenario = scenarioId === "inbox-empty";
  const listErrorScenario = scenarioId === "inbox-list-error";
  const threadErrorScenario = scenarioId === "inbox-thread-error";
  const draftSendErrorScenario = scenarioId === "inbox-draft-send-error";
  const scheduleDetectErrorScenario = scenarioId === "inbox-schedule-detect-error";
  const scheduleNormalScenario = scenarioId === "inbox-schedule-normal";
  const completedNormalScenario = scenarioId === "inbox-completed-normal";
  const autoSentNormalScenario = scenarioId === "inbox-auto-sent-normal";
  const useDemoDataMode = Boolean(scenarioId?.startsWith("inbox-"));

  const getInitialStatus = (): InboxStatus => {
    if (completedNormalScenario) {
      return "completed";
    }
    if (autoSentNormalScenario) {
      return "auto-sent";
    }

    return "pending";
  };

  const getInitialSelectedEmailId = () => {
    if (!useDemoDataMode) {
      return "";
    }

    if (emptyScenario) {
      return "";
    }
    if (scheduleNormalScenario) {
      return "3";
    }
    if (completedNormalScenario) {
      return "4";
    }
    if (autoSentNormalScenario) {
      return "2";
    }

    return "1";
  };

  const [emails, setEmails] = useState<EmailItem[]>(() =>
    useDemoDataMode && !emptyScenario ? (emailItems as EmailItem[]) : []
  );
  const [activeStatus, setActiveStatus] = useState<InboxStatus>(getInitialStatus);
  const [selectedEmailId, setSelectedEmailId] = useState(getInitialSelectedEmailId);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(!useDemoDataMode);
  const [listLoadError, setListLoadError] = useState<string | null>(null);
  const [isHydratingDetails, setIsHydratingDetails] = useState(false);
  const [isSeedingTestEmail, setIsSeedingTestEmail] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!useDemoDataMode) {
      return;
    }

    if (emptyScenario) {
      setEmails([]);
      setSelectedEmailId("");
      setMobileDetailOpen(false);
      return;
    }

    setEmails(emailItems as EmailItem[]);
    setActiveStatus(getInitialStatus());
    setSelectedEmailId(getInitialSelectedEmailId());
  }, [autoSentNormalScenario, completedNormalScenario, emptyScenario, scheduleNormalScenario, useDemoDataMode]);

  useEffect(() => {
    if (useDemoDataMode) {
      return;
    }

    let cancelled = false;

    async function loadInbox() {
      setIsLoadingList(true);
      setListLoadError(null);

      try {
        const status = mapFrontendInboxStatus(activeStatus);
        const listResponse = await getInboxList({
          status,
          size: 100,
        });

        if (cancelled) {
          return;
        }

        const mappedList = (listResponse.content ?? []).map(mapInboxListItem);
        setEmails(mappedList);

        if (!mappedList.length) {
          setIsHydratingDetails(false);
          return;
        }

        setIsHydratingDetails(true);

        const detailResults = await Promise.allSettled(
          mappedList.map(async (item) => {
            const detail = await getInboxDetail(Number(item.id));
            return { id: item.id, detail };
          }),
        );

        if (cancelled) {
          return;
        }

        setEmails((current) =>
          current.map((item) => {
            const result = detailResults.find(
              (entry): entry is PromiseFulfilledResult<{ id: string; detail: Awaited<ReturnType<typeof getInboxDetail>> }> =>
                entry.status === "fulfilled" && entry.value.id === item.id,
            );

            if (!result) {
              return item;
            }

            return mergeInboxDetail(item, result.value.detail);
          }),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setListLoadError(getErrorMessage(error, "메일 목록을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
          setIsHydratingDetails(false);
        }
      }
    }

    void loadInbox();

    return () => {
      cancelled = true;
    };
  }, [activeStatus, reloadToken, useDemoDataMode]);

  const visibleEmails = useMemo<EmailItem[]>(
    () =>
      activeStatus === "all"
        ? emails
        : emails.filter((item: EmailItem) => item.status === activeStatus),
    [activeStatus, emails]
  );

  useEffect(() => {
    if (!visibleEmails.length) {
      setSelectedEmailId("");
      setMobileDetailOpen(false);
      return;
    }

    if (!visibleEmails.some((item: EmailItem) => item.id === selectedEmailId)) {
      setSelectedEmailId(visibleEmails[0].id);
    }
  }, [selectedEmailId, visibleEmails]);

  const selectedEmail =
    visibleEmails.find((item: EmailItem) => item.id === selectedEmailId) ||
    visibleEmails[0] ||
    null;
  const selectedRecommendationState = selectedEmail?.recommendationState;
  const selectedMatchingText = selectedEmail?.matchingText?.trim() ?? "";

  const shouldPollSelectedEmail =
    !useDemoDataMode &&
    selectedEmail != null &&
    selectedEmail.status === "pending" &&
    (!selectedEmail.summary.trim() || !selectedEmail.matchingText);

  const selectedEmailLoading =
    !useDemoDataMode &&
    isHydratingDetails &&
    selectedEmail != null &&
    !selectedEmail.body &&
    !threadErrorScenario;

  const handleStatusChange = (status: InboxStatus) => {
    setActiveStatus(status);
    setMobileDetailOpen(false);
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    setMobileDetailOpen(true);
  };

  const updateSelectedEmail = (
    updater: (current: EmailItem) => EmailItem,
    successMessage: string
  ) => {
    setEmails((current) =>
      current.map((item) =>
        item.id === selectedEmailId ? updater(item) : item
      )
    );
    toast.success(successMessage);
  };

  const pendingCount = emails.filter((item: EmailItem) => item.status === "pending").length;
  const unsentCount = emails.filter((item: EmailItem) => item.status === "unsent").length;

  useEffect(() => {
    if (useDemoDataMode || !selectedEmailId || !selectedEmail) {
      return;
    }

    if (!selectedMatchingText) {
      return;
    }

    if (selectedRecommendationState && selectedRecommendationState !== "idle") {
      return;
    }

    setEmails((current) =>
      current.map((item) =>
        item.id === selectedEmailId
          ? { ...item, recommendationState: "loading", recommendationError: undefined }
          : item,
      ),
    );
  }, [
    selectedMatchingText,
    selectedRecommendationState,
    selectedEmailId,
    useDemoDataMode,
  ]);

  useEffect(() => {
    if (useDemoDataMode || !selectedEmailId || !selectedEmail) {
      return;
    }

    if (!selectedMatchingText || selectedRecommendationState !== "loading") {
      return;
    }

    let cancelled = false;

    async function loadRecommendations() {
      try {
        const response = await getInboxRecommendations(Number(selectedEmailId), 3);
        if (cancelled) {
          return;
        }

        const recommendations = (response ?? [])
          .map(mapInboxRecommendation)
          .filter((item): item is NonNullable<typeof item> => item != null);

        setEmails((current) =>
          current.map((item) =>
            item.id === selectedEmailId
              ? mergeInboxRecommendations(
                  item,
                  recommendations,
                  recommendations.length ? "ready" : "empty",
                )
              : item,
          ),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setEmails((current) =>
          current.map((item) =>
            item.id === selectedEmailId
              ? mergeInboxRecommendations(
                  item,
                  [],
                  "error",
                  getErrorMessage(error, "추천 템플릿을 불러오지 못했습니다."),
                )
              : item,
          ),
        );
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [
    selectedMatchingText,
    selectedRecommendationState,
    selectedEmailId,
    useDemoDataMode,
  ]);

  useEffect(() => {
    if (!shouldPollSelectedEmail || !selectedEmailId) {
      return;
    }

    let cancelled = false;

    async function refreshSelectedEmail() {
      try {
        const detail = await getInboxDetail(Number(selectedEmailId));
        if (cancelled) {
          return;
        }

        setEmails((current) =>
          current.map((item) => {
            if (item.id !== selectedEmailId) {
              return item;
            }

            const merged = mergeInboxDetail(item, detail);
            const shouldReloadRecommendations =
              Boolean(merged.matchingText) &&
              !merged.recommendations?.length &&
              merged.recommendationState === "error";

            return shouldReloadRecommendations
              ? {
                  ...merged,
                  recommendations: [],
                  recommendationState: "idle",
                  recommendationError: undefined,
                }
              : merged;
          }),
        );
      } catch (_error) {
        // Polling failures should not replace the current UI state.
      }
    }

    void refreshSelectedEmail();
    const intervalId = window.setInterval(() => {
      void refreshSelectedEmail();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedEmailId, shouldPollSelectedEmail]);

  const handleSend = async () => {
    if (!selectedEmail) {
      return;
    }

    if (draftSendErrorScenario) {
      toast.error("답변을 발송하지 못했습니다.");
      return;
    }

    if (useDemoDataMode) {
      updateSelectedEmail(
        (item) => ({
          ...item,
          status: "completed",
          sentTime: "방금 전",
          draftStatus: "SENT",
        }),
        "답변을 발송했습니다."
      );
      return;
    }

    try {
      const response = await sendInboxReply(Number(selectedEmail.id));
      updateSelectedEmail(
        (item) => ({
          ...item,
          status: "completed",
          sentTime: getCurrentTimeLabel(),
          draftStatus: "SENT",
        }),
        response.message || "답변을 발송했습니다."
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "답변을 발송하지 못했습니다."));
    }
  };

  const handleEditSend = async () => {
    if (!selectedEmail) {
      return;
    }

    if (draftSendErrorScenario) {
      toast.error("수정본 발송을 완료하지 못했습니다.");
      return;
    }

    if (useDemoDataMode) {
      updateSelectedEmail(
        (item) => ({
          ...item,
          status: "completed",
          sentTime: "방금 전",
          draft: `${item.draft}\n\n[검토 후 발송됨]`,
          draftStatus: "EDITED",
        }),
        "수정본을 발송했습니다."
      );
      return;
    }

    try {
      const response = await editAndSendInboxReply(Number(selectedEmail.id), selectedEmail.draft);
      updateSelectedEmail(
        (item) => ({
          ...item,
          status: "completed",
          sentTime: getCurrentTimeLabel(),
          draftStatus: "EDITED",
        }),
        response.message || "수정본을 발송했습니다."
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "수정본 발송을 완료하지 못했습니다."));
    }
  };

  const handleSkip = async () => {
    if (!selectedEmail) {
      return;
    }

    if (useDemoDataMode) {
      updateSelectedEmail(
        (item) => ({
          ...item,
          status: "unsent",
          sentTime: "읽음 확인",
          draftStatus: "SKIPPED",
        }),
        "이메일을 미발송 상태로 이동했습니다."
      );
      return;
    }

    try {
      const response = await skipInboxReply(Number(selectedEmail.id));
      updateSelectedEmail(
        (item) => ({
          ...item,
          status: "unsent",
          sentTime: "읽음 확인",
          draftStatus: "SKIPPED",
        }),
        response.message || "이메일을 미발송 상태로 이동했습니다."
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "미발송 처리를 완료하지 못했습니다."));
    }
  };

  const handleSeedTestEmail = async () => {
    if (useDemoDataMode || isSeedingTestEmail) {
      return;
    }

    try {
      setIsSeedingTestEmail(true);
      const response = await seedInboxTestEmail();
      setActiveStatus("pending");
      setSelectedEmailId(String(response.email_id));
      setReloadToken((current) => current + 1);
      toast.success(response.message || "테스트 메일을 추가했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "테스트 메일을 추가하지 못했습니다."));
    } finally {
      setIsSeedingTestEmail(false);
    }
  };

  const emptyInboxAction = !useDemoDataMode ? (
    <button
      type="button"
      className="app-cta-accent inline-flex min-w-[180px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium"
      onClick={() => void handleSeedTestEmail()}
      disabled={isSeedingTestEmail}
    >
      {isSeedingTestEmail ? "테스트 메일 추가 중..." : "테스트 메일 추가"}
    </button>
  ) : null;

  const seedTestEmailAction = !useDemoDataMode ? (
    <button
      type="button"
      className="app-secondary-button inline-flex min-w-[140px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium"
      onClick={() => void handleSeedTestEmail()}
      disabled={isSeedingTestEmail}
    >
      {isSeedingTestEmail ? "추가 중..." : "테스트 메일 추가"}
    </button>
  ) : null;

  const draftBanner =
    draftSendErrorScenario
      ? {
          title: "답변 발송을 완료하지 못했습니다",
          description: "초안은 유지되었으며, 네트워크 상태를 확인한 뒤 다시 발송할 수 있습니다.",
          tone: "error" as const,
        }
      : scheduleDetectErrorScenario
        ? {
            title: "일정 감지 제안을 불러오지 못했습니다",
            description: "이 메일의 일정 후보를 해석하지 못했습니다. 캘린더 화면에서 수동으로 일정을 추가할 수 있습니다.",
            tone: "warning" as const,
          }
        : !useDemoDataMode
          ? {
              title: "현재 수신함 연결 범위",
              description: "미발송 상태는 백엔드 draft_status를 우선 사용하며, 추천 템플릿은 RAG 매칭 결과를 기준으로 순차 로드합니다.",
              tone: "neutral" as const,
            }
          : null;

  const renderThreadContent = () => {
    if (threadErrorScenario) {
      return (
        <StatePanel
          title="메일 상세를 불러오지 못했습니다"
          description="선택한 메일의 본문과 분류 정보를 확인하는 중 오류가 발생했습니다."
          className="min-h-[540px]"
        />
      );
    }

    if (selectedEmailLoading) {
      return (
        <StatePanel
          title="메일 상세를 불러오는 중입니다"
          description="메일 본문, 요약, 초안 정보를 순서대로 불러오고 있습니다."
          tone="neutral"
          className="min-h-[540px]"
        />
      );
    }

    return <EmailThreadPanel email={selectedEmail} />;
  };

  return (
    <div className="h-full w-full min-w-0 bg-background">
      <div className="scrollbar-none h-full overflow-y-auto xl:hidden">
        {mobileDetailOpen && selectedEmail ? (
          <div className="space-y-4 px-4 py-4">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-[#64748B] transition hover:text-[#1E2A3A]"
              onClick={() => setMobileDetailOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
              목록으로
            </button>

            <div className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
              {renderThreadContent()}
            </div>

            <div className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
              {draftBanner ? (
                <StateBanner
                  title={draftBanner.title}
                  description={draftBanner.description}
                  tone={draftBanner.tone}
                  className="mb-4"
                />
              ) : null}
              <DraftPanel
                email={selectedEmail}
                onSend={() => void handleSend()}
                onEditSend={() => void handleEditSend()}
                onSkip={() => void handleSkip()}
              />
            </div>
          </div>
        ) : (
          <div className="border-b border-border bg-card">
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <InboxStatusTabs
                activeStatus={activeStatus}
                pendingCount={pendingCount}
                unsentCount={unsentCount}
                onChange={handleStatusChange}
              />
              {seedTestEmailAction}
            </div>

            <div className="px-2 py-2">
              {listErrorScenario || listLoadError ? (
                <StatePanel
                  title="메일 목록을 불러오지 못했습니다"
                  description={listLoadError ?? "수신함 목록 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요."}
                  className="min-h-[320px]"
                />
              ) : isLoadingList ? (
                <StatePanel
                  title="메일 목록을 불러오는 중입니다"
                  description="받은 메일과 현재 상태를 불러오고 있습니다."
                  tone="neutral"
                  className="min-h-[320px]"
                />
              ) : visibleEmails.length === 0 ? (
                <StatePanel
                  title="표시할 이메일이 없습니다"
                  description="현재 필터 조건에 맞는 메일이 없습니다. 로컬 테스트용 메일을 추가하거나 다른 상태 탭을 선택해 보세요."
                  tone="empty"
                  action={emptyInboxAction}
                  className="min-h-[320px]"
                />
              ) : (
                <EmailListPanel
                  emails={visibleEmails}
                  selectedEmailId={selectedEmail?.id}
                  onSelect={handleSelectEmail}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hidden h-full min-h-0 xl:grid xl:grid-cols-[320px_minmax(0,1fr)_390px]">
        <div className="flex min-h-0 flex-col border-r border-border bg-card">
          <div className="px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <InboxStatusTabs
                activeStatus={activeStatus}
                pendingCount={pendingCount}
                unsentCount={unsentCount}
                onChange={handleStatusChange}
              />
              {seedTestEmailAction}
            </div>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <div>
              {listErrorScenario || listLoadError ? (
                <StatePanel
                  title="메일 목록을 불러오지 못했습니다"
                  description={listLoadError ?? "메일 인덱스 응답을 확인할 수 없습니다. 다시 시도해 주세요."}
                  className="min-h-[520px]"
                />
              ) : isLoadingList ? (
                <StatePanel
                  title="메일 목록을 불러오는 중입니다"
                  description="받은 메일과 상태를 불러오고 있습니다."
                  tone="neutral"
                  className="min-h-[520px]"
                />
              ) : visibleEmails.length === 0 ? (
                <StatePanel
                  title="선택한 상태에 메일이 없습니다"
                  description="검토할 메일이 모두 처리되었거나 필터 조건에 맞는 항목이 없습니다. 로컬 테스트용 메일을 추가해 바로 확인할 수 있습니다."
                  tone="empty"
                  action={emptyInboxAction}
                  className="min-h-[520px]"
                />
              ) : (
                <EmailListPanel
                  emails={visibleEmails}
                  selectedEmailId={selectedEmail?.id}
                  onSelect={(id: string) => setSelectedEmailId(id)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 border-r border-border bg-card">
          <div className="scrollbar-none h-full overflow-y-auto px-5 py-5">
            {renderThreadContent()}
          </div>
        </div>

        <div className="min-h-0 bg-card">
          <div className="scrollbar-none h-full overflow-y-auto px-5 py-5">
            {draftBanner ? (
              <StateBanner
                title={draftBanner.title}
                description={draftBanner.description}
                tone={draftBanner.tone}
                className="mb-4"
              />
            ) : null}
            <DraftPanel
              email={selectedEmail}
              onSend={() => void handleSend()}
              onEditSend={() => void handleEditSend()}
              onSkip={() => void handleSkip()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
