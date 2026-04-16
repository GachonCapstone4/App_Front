import { useEffect, useMemo, useState } from "react";
import { MessageSquareMore, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import {
  createSupportTicket,
  getSupportTicket,
  getSupportTickets,
  type SupportTicketDetail,
  type SupportTicketSummary,
} from "../../../shared/api/support";
import { getErrorMessage } from "../../../shared/api/http";
import { subscribeAppEvent } from "../../../shared/lib/app-event-stream";
import { SectionCard } from "../../../shared/ui/primitives/SectionCard";
import { StateBanner } from "../../../shared/ui/primitives/StateBanner";
import { StatusBadge } from "../../../shared/ui/primitives/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../app/components/ui/dialog";

type SupportTicketStatus = "PENDING" | "ANSWERED";
type SupportTicketFilter = "all" | SupportTicketStatus;

function formatTicketStatus(status: SupportTicketStatus) {
  return status === "ANSWERED"
    ? { label: "답변 완료", tone: "success" as const }
    : { label: "답변 대기", tone: "warning" as const };
}

function formatTicketDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

interface AdminInquirySettingsPanelProps {
  scenarioId?: string | null;
}

const demoTickets: SupportTicketSummary[] = [
  {
    ticketId: "support-101",
    title: "캘린더 등록 자동화 동작 문의",
    contentPreview: "미팅 요청 메일에서 감지된 일정이 어떤 조건일 때 자동 등록되는지 확인하고 싶습니다.",
    status: "ANSWERED",
    createdAt: "2026-03-01T14:10:00",
  },
  {
    ticketId: "support-102",
    title: "템플릿 재생성 요청 처리 시간 문의",
    contentPreview: "템플릿 재생성 요청 후 처리 완료까지 예상 시간을 알고 싶습니다.",
    status: "PENDING",
    createdAt: "2026-03-02T09:30:00",
  },
];

const demoTicketDetails: Record<string, SupportTicketDetail> = {
  "support-101": {
    ticketId: "support-101",
    title: "캘린더 등록 자동화 동작 문의",
    content:
      "미팅 요청 메일에서 감지된 일정이 어떤 조건일 때 자동 등록되는지 확인하고 싶습니다.",
    status: "ANSWERED",
    createdAt: "2026-03-01T14:10:00",
    adminReply:
      "현재는 확인된 일정만 캘린더 대기 상태로 저장되며, 사용자가 확인 후 등록하는 흐름입니다.",
  },
  "support-102": {
    ticketId: "support-102",
    title: "템플릿 재생성 요청 처리 시간 문의",
    content: "템플릿 재생성 요청 후 처리 완료까지 예상 시간을 알고 싶습니다.",
    status: "PENDING",
    createdAt: "2026-03-02T09:30:00",
    adminReply: null,
  },
};

export function AdminInquirySettingsPanel({
  scenarioId,
}: AdminInquirySettingsPanelProps) {
  const useDemoDataMode =
    scenarioId === "settings-demo" || Boolean(scenarioId?.startsWith("settings-"));
  const supportDialogNormalScenario = scenarioId === "settings-support-dialog-normal";
  const supportSubmitErrorScenario = scenarioId === "settings-support-submit-error";
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [activeFilter, setActiveFilter] = useState<SupportTicketFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = async (silent = false) => {
    try {
      const nextTickets = await getSupportTickets();
      setTickets(nextTickets);
      setSelectedTicketId((current) => current || nextTickets[0]?.ticketId || "");
    } catch (error) {
      if (!silent) {
        throw error;
      }
    }
  };

  const loadTicketDetail = async (ticketId: string, silent = false) => {
    setDetailLoading(true);

    try {
      const ticketDetail = await getSupportTicket(ticketId);
      setSelectedTicket(ticketDetail);
    } catch (error) {
      if (!silent) {
        throw error;
      }
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (supportDialogNormalScenario) {
      setDialogOpen(true);
      setDraftTitle("캘린더 등록 자동화 동작 문의");
      setDraftContent(
        "미팅 요청 메일에서 감지된 일정이 어떤 조건일 때 자동 등록되는지 확인하고 싶습니다.",
      );
      return;
    }

    if (!supportSubmitErrorScenario) {
      return;
    }

    setDialogOpen(true);
    setDraftTitle("캘린더 등록 실패 문의");
    setDraftContent(
      "일정 추가 후 저장을 눌렀지만 캘린더에 반영되지 않습니다. 로그를 확인하고 싶습니다.",
    );
  }, [supportDialogNormalScenario, supportSubmitErrorScenario]);

  useEffect(() => {
    if (useDemoDataMode) {
      setTickets(demoTickets);
      setSelectedTicketId(demoTickets[0]?.ticketId ?? "");
      setSelectedTicket(demoTicketDetails[demoTickets[0]?.ticketId ?? ""] ?? null);
      setLoading(false);
      return;
    }

    let mounted = true;

    void loadTickets()
      .catch((error) => {
        if (!mounted) {
          return;
        }

        toast.error(getErrorMessage(error, "문의 목록을 불러오지 못했습니다."));
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
  }, [useDemoDataMode]);

  const visibleTickets = useMemo(
    () =>
      activeFilter === "all"
        ? tickets
        : tickets.filter((ticket) => ticket.status === activeFilter),
    [activeFilter, tickets],
  );

  useEffect(() => {
    if (!visibleTickets.length) {
      setSelectedTicketId("");
      setSelectedTicket(null);
      return;
    }

    if (!visibleTickets.some((ticket) => ticket.ticketId === selectedTicketId)) {
      setSelectedTicketId(visibleTickets[0].ticketId);
    }
  }, [selectedTicketId, visibleTickets]);

  useEffect(() => {
    if (useDemoDataMode) {
      setSelectedTicket(
        selectedTicketId ? demoTicketDetails[selectedTicketId] ?? null : null,
      );
      setDetailLoading(false);
      return;
    }

    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    let mounted = true;

    void loadTicketDetail(selectedTicketId)
      .catch((error) => {
        if (!mounted) {
          return;
        }

        toast.error(getErrorMessage(error, "문의 상세를 불러오지 못했습니다."));
      });

    return () => {
      mounted = false;
    };
  }, [selectedTicketId, useDemoDataMode]);

  useEffect(() => {
    if (useDemoDataMode) {
      return;
    }

    const unsubscribe = subscribeAppEvent("support-ticket-updated", (payload) => {
      const ticketId = payload.ticket_id == null ? "" : String(payload.ticket_id).trim();

      if (!ticketId) {
        return;
      }

      void loadTickets(true);

      if (ticketId === selectedTicketId) {
        void loadTicketDetail(ticketId, true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedTicketId, useDemoDataMode]);

  const selectedSummary =
    visibleTickets.find((ticket) => ticket.ticketId === selectedTicketId) ??
    visibleTickets[0] ??
    null;
  const selectedStatus = selectedTicket?.status ?? selectedSummary?.status ?? null;

  const submitTicket = async () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast.error("문의 제목과 내용을 모두 입력하세요.");
      return;
    }

    if (supportSubmitErrorScenario) {
      toast.error("문의 등록을 완료하지 못했습니다.");
      return;
    }

    if (useDemoDataMode) {
      const createdTicket: SupportTicketSummary = {
        ticketId: `support-demo-${Date.now()}`,
        title: draftTitle.trim(),
        contentPreview: draftContent.trim(),
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };

      const createdDetail: SupportTicketDetail = {
        ...createdTicket,
        content: draftContent.trim(),
        adminReply: null,
      };

      demoTicketDetails[createdTicket.ticketId] = createdDetail;
      setTickets((current) => [createdTicket, ...current]);
      setSelectedTicketId(createdTicket.ticketId);
      setSelectedTicket(createdDetail);
      setDraftTitle("");
      setDraftContent("");
      setDialogOpen(false);
      toast.success("데모 모드에서 관리자 문의 등록을 확인했습니다.");
      return;
    }

    setSubmitting(true);

    try {
      const createdTicket = await createSupportTicket(draftTitle.trim(), draftContent.trim());
      await loadTickets();
      setSelectedTicketId(createdTicket.ticketId);
      setDraftTitle("");
      setDraftContent("");
      setDialogOpen(false);
      toast.success("관리자 문의를 등록했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "관리자 문의를 등록하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SectionCard
        title="관리자 문의"
        description="문의 작성, 처리 상태 확인, 관리자 답변 열람"
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1E2A3A] px-4 py-2 text-sm font-medium text-white"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            문의 작성
          </button>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "전체" },
                { id: "PENDING", label: "답변 대기" },
                { id: "ANSWERED", label: "답변 완료" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    activeFilter === filter.id
                      ? "bg-[#1E2A3A] text-white"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                  onClick={() => setActiveFilter(filter.id as SupportTicketFilter)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  문의 목록을 불러오는 중입니다.
                </div>
              ) : visibleTickets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  등록된 문의가 없습니다.
                </div>
              ) : (
                visibleTickets.map((ticket) => {
                  const statusMeta = formatTicketStatus(ticket.status);

                  return (
                    <button
                      key={ticket.ticketId}
                      type="button"
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        selectedSummary?.ticketId === ticket.ticketId
                          ? "border-[#2DD4BF] bg-[#F0FDFA]"
                          : "border-border bg-card hover:border-[#CBD5E1]"
                      }`}
                      onClick={() => setSelectedTicketId(ticket.ticketId)}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {ticket.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{ticket.ticketId}</p>
                        </div>
                        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {ticket.contentPreview}
                      </p>
                      <p className="mt-3 text-[11px] text-slate-400">
                        {formatTicketDate(ticket.createdAt)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-[#F8FAFC] p-5">
            {selectedSummary ? (
              detailLoading && !selectedTicket ? (
                <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
                  문의 상세를 불러오는 중입니다.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {selectedTicket?.title ?? selectedSummary.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        문의 ID {selectedSummary.ticketId} ·{" "}
                        {formatTicketDate(selectedTicket?.createdAt ?? selectedSummary.createdAt)}
                      </p>
                    </div>
                    {selectedStatus ? (
                      <StatusBadge
                        label={formatTicketStatus(selectedStatus).label}
                        tone={formatTicketStatus(selectedStatus).tone}
                      />
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="mb-2 text-xs font-medium text-[#94A3B8]">문의 내용</p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {selectedTicket?.content ?? selectedSummary.contentPreview}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MessageSquareMore className="h-4 w-4 text-[#0F766E]" />
                      <p className="text-xs font-medium text-[#94A3B8]">관리자 답변</p>
                    </div>
                    {selectedTicket?.adminReply ? (
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {selectedTicket.adminReply}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        아직 관리자 답변이 등록되지 않았습니다. 답변이 작성되면 이 탭에서 바로 확인할 수 있습니다.
                      </p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 text-center">
                <div>
                  <MessageSquareMore className="mx-auto h-10 w-10 text-[#94A3B8]" />
                  <p className="mt-4 text-sm font-medium text-foreground">표시할 문의가 없습니다</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    새 문의를 작성하면 처리 상태와 관리자 답변을 이 화면에서 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>관리자 문의 작성</DialogTitle>
            <DialogDescription>
              설정, 연동, 템플릿, 일정 동작 관련 문의를 등록할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {supportSubmitErrorScenario ? (
            <StateBanner
              title="문의 등록을 완료하지 못했습니다"
              description="문의 저장 응답이 지연되고 있습니다. 내용을 유지한 채 다시 시도해 주세요."
              tone="error"
            />
          ) : null}

          <div className="space-y-4">
            <label className="block text-sm text-foreground">
              제목
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="문의 제목을 입력하세요"
                className="app-form-input mt-2 h-11 w-full rounded-xl px-4 text-sm"
              />
            </label>

            <label className="block text-sm text-foreground">
              내용
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                rows={6}
                placeholder="관리자에게 전달할 문의 내용을 자세히 입력하세요"
                className="app-form-input mt-2 w-full resize-none rounded-xl px-4 py-3 text-sm"
              />
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
              onClick={() => setDialogOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E2A3A] px-4 py-2 text-sm text-white"
              onClick={() => void submitTicket()}
              disabled={submitting}
            >
              <Send className="h-4 w-4" />
              {submitting ? "등록 중..." : "문의 등록"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
