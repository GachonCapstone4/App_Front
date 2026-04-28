import { useEffect, useMemo, useState } from "react";
import { Filter, Send } from "lucide-react";
import { useSearchParams } from "react-router";
import {
  getAdminSupportTicket,
  getAdminSupportTickets,
  replyAdminSupportTicket,
} from "../../shared/api/admin";
import { getErrorMessage } from "../../shared/api/http";
import { formatKstDateTime } from "../../shared/lib/date-time";
import { inquiries, responseHistory } from "../shared/mock/adminData";
import { MetricCard } from "../shared/ui/MetricCard";
import { PageHeader } from "../shared/ui/PageHeader";
import { AdminStateNotice } from "../shared/ui/AdminStateNotice";
import { AdminStatePage } from "../shared/ui/AdminStatePage";
import { StatusBadge } from "../shared/ui/StatusBadge";

export function InquiriesPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = searchParams.get("scenario");
  const useDemoDataMode = Boolean(scenarioId?.startsWith("admin-"));
  const loadErrorScenario = scenarioId === "admin-inquiries-load-error";
  const emptyScenario = scenarioId === "admin-inquiries-empty";
  const replyErrorScenario = scenarioId === "admin-inquiries-reply-error";
  const [inquiryItems, setInquiryItems] = useState(emptyScenario ? [] : inquiries);
  const [historyMap, setHistoryMap] = useState(responseHistory);
  const [selectedId, setSelectedId] = useState(
    (emptyScenario ? [] : inquiries)[0]?.id ?? "",
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [replyDraft, setReplyDraft] = useState(
    replyErrorScenario ? "안녕하세요. 확인 후 다시 안내드리겠습니다." : "",
  );
  const [saveNotice, setSaveNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState(
    replyErrorScenario
      ? "관리자 답변 저장 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "",
  );
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingReply, setSavingReply] = useState(false);

  const loadTickets = async () => {
    const nextTickets = await getAdminSupportTickets(50);
    const mappedTickets = nextTickets.map((ticket) => ({
      id: ticket.ticketId,
      requester: `사용자 #${ticket.userId}`,
      company: "계정 상세 정보 미연동",
      title: ticket.title,
      status: ticket.status === "ANSWERED" ? "답변완료" : "답변전",
      email: `user-${ticket.userId}`,
      industry: "업종 정보 미연동",
      latestResponder: ticket.status === "ANSWERED" ? "관리자" : "고객",
      content: "",
      createdAt: ticket.createdAt,
      updatedAt: ticket.createdAt,
    }));

    setInquiryItems(mappedTickets);
    setSelectedId((current) => current || mappedTickets[0]?.id || "");
  };

  useEffect(() => {
    if (useDemoDataMode && emptyScenario) {
      setInquiryItems([]);
      setSelectedId("");
      return;
    }

    if (useDemoDataMode) {
      setInquiryItems(inquiries);
      setSelectedId((current) => current || inquiries[0]?.id || "");
      return;
    }

    let mounted = true;
    setLoading(true);
    setErrorNotice("");

    void loadTickets()
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setErrorNotice(getErrorMessage(error, "문의 목록을 불러오지 못했습니다."));
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
  }, [emptyScenario, useDemoDataMode]);

  const filteredInquiries = useMemo(
    () =>
      statusFilter === "all"
        ? inquiryItems
        : inquiryItems.filter((item) => item.status === statusFilter),
    [inquiryItems, statusFilter],
  );

  useEffect(() => {
    if (!filteredInquiries.length) {
      setSelectedId("");
      return;
    }

    if (!filteredInquiries.some((item) => item.id === selectedId)) {
      setSelectedId(filteredInquiries[0].id);
    }
  }, [filteredInquiries, selectedId]);

  const selectedInquiry =
    filteredInquiries.find((inquiry) => inquiry.id === selectedId) ?? filteredInquiries[0] ?? null;
  const history = useMemo(() => {
    if (!selectedInquiry) {
      return [];
    }

    if (useDemoDataMode) {
      return historyMap[selectedInquiry.id] ?? [];
    }

    const items = [
      {
        at: selectedInquiry.createdAt,
        author: selectedInquiry.requester,
        channel: "문의 접수",
        note: selectedInquiry.content,
      },
    ];

    if (selectedInquiry.status === "답변완료" && selectedInquiry.latestResponder === "관리자") {
      items.unshift({
        at: selectedInquiry.updatedAt,
        author: "관리자",
        channel: "관리자 답변",
        note: replyDraft.trim() && saveNotice ? replyDraft.trim() : "저장된 관리자 답변",
      });
    }

    return items;
  }, [historyMap, replyDraft, saveNotice, selectedInquiry, useDemoDataMode]);

  const summaryCards = useMemo(
    () => [
      {
        label: "전체 문의",
        value: `${inquiryItems.length}건`,
        hint: "관리자 문의 전체 건수",
      },
      {
        label: "답변 전",
        value: `${inquiryItems.filter((item) => item.status === "답변전").length}건`,
        hint: "우선 확인 필요",
      },
      {
        label: "답변 완료",
        value: `${inquiryItems.filter((item) => item.status === "답변완료").length}건`,
        hint: "관리자 회신 완료",
      },
    ],
    [inquiryItems],
  );

  const handleSubmitReply = () => {
    const trimmedReply = replyDraft.trim();

    if (!selectedInquiry || !trimmedReply) {
      return;
    }

    if (!useDemoDataMode) {
      setSavingReply(true);
      setSaveNotice("");
      setErrorNotice("");

      void replyAdminSupportTicket(selectedInquiry.id, trimmedReply)
        .then(async () => {
          const [ticketDetail, tickets] = await Promise.all([
            getAdminSupportTicket(selectedInquiry.id),
            getAdminSupportTickets(50),
          ]);

          const mappedTickets = tickets.map((ticket) => ({
            id: ticket.ticketId,
            requester: `사용자 #${ticket.userId}`,
            company: "계정 상세 정보 미연동",
            title: ticket.title,
            status: ticket.status === "ANSWERED" ? "답변완료" : "답변전",
            email: `user-${ticket.userId}`,
            industry: "업종 정보 미연동",
            latestResponder: ticket.status === "ANSWERED" ? "관리자" : "고객",
            content: "",
            createdAt: ticket.createdAt,
            updatedAt: ticket.createdAt,
          }));

          setInquiryItems(mappedTickets);
          setSelectedId(String(ticketDetail.ticketId));
          setReplyDraft("");
          setSaveNotice("답변을 저장했고 문의 상태를 답변완료로 갱신했습니다.");
          setHistoryMap((current) => ({
            ...current,
            [selectedInquiry.id]: [
              {
                at: ticketDetail.repliedAt ?? "방금 전",
                author: "관리자",
                channel: "관리자 답변",
                note: ticketDetail.adminReply ?? trimmedReply,
              },
              {
                at: ticketDetail.createdAt,
                author: `사용자 #${ticketDetail.userId}`,
                channel: "문의 접수",
                note: ticketDetail.content,
              },
            ],
          }));
        })
        .catch((error) => {
          setSaveNotice("");
          setErrorNotice(getErrorMessage(error, "관리자 답변 저장 요청을 처리하지 못했습니다."));
        })
        .finally(() => {
          setSavingReply(false);
        });

      return;
    }

    if (replyErrorScenario) {
      setSaveNotice("");
      setErrorNotice("관리자 답변 저장 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const nextReply = {
      at: "방금 전",
      author: "관리자",
      channel: "관리자 답변",
      note: trimmedReply,
    };

    const nextSystemLog = {
      at: "방금 전",
      author: "시스템",
      channel: "상태 갱신",
      note: "문의 상태를 답변완료로 변경하고 답변 이력을 저장했습니다.",
    };

    setHistoryMap((current) => ({
      ...current,
      [selectedInquiry.id]: [nextReply, nextSystemLog, ...(current[selectedInquiry.id] ?? [])],
    }));

    setInquiryItems((current) =>
      current.map((item) =>
        item.id === selectedInquiry.id
          ? {
              ...item,
              status: "답변완료",
              latestResponder: "관리자",
              updatedAt: "방금 전",
            }
          : item,
      ),
    );

    setReplyDraft("");
    setErrorNotice("");
    setSaveNotice("답변을 저장했고 문의 상태를 답변완료로 갱신했습니다.");
  };

  useEffect(() => {
    setReplyDraft(replyErrorScenario ? "안녕하세요. 확인 후 다시 안내드리겠습니다." : "");
    setSaveNotice("");
    setErrorNotice(
      replyErrorScenario
        ? "관리자 답변 저장 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "",
    );
  }, [replyErrorScenario, selectedId]);

  useEffect(() => {
    if (useDemoDataMode) {
      return;
    }

    if (!selectedInquiry?.id) {
      return;
    }

    let mounted = true;
    setDetailLoading(true);

    void getAdminSupportTicket(selectedInquiry.id)
      .then((ticketDetail) => {
        if (!mounted) {
          return;
        }

        setInquiryItems((current) =>
          current.map((item) =>
            item.id === selectedInquiry.id
              ? {
                  ...item,
                  content: ticketDetail.content,
                  status: ticketDetail.status === "ANSWERED" ? "답변완료" : "답변전",
                  latestResponder: ticketDetail.adminReply ? "관리자" : "고객",
                  updatedAt: ticketDetail.repliedAt ?? ticketDetail.createdAt,
                }
              : item,
          ),
        );

        setHistoryMap((current) => ({
          ...current,
          [selectedInquiry.id]: [
            ...(ticketDetail.adminReply
              ? [
                  {
                    at: ticketDetail.repliedAt ?? ticketDetail.createdAt,
                    author: "관리자",
                    channel: "관리자 답변",
                    note: ticketDetail.adminReply,
                  },
                ]
              : []),
            {
              at: ticketDetail.createdAt,
              author: `사용자 #${ticketDetail.userId}`,
              channel: "문의 접수",
              note: ticketDetail.content,
            },
          ],
        }));
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setErrorNotice(getErrorMessage(error, "문의 상세를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!mounted) {
          return;
        }

        setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedInquiry?.id, useDemoDataMode]);

  if (loadErrorScenario) {
    return (
      <AdminStatePage
        title="문의 대응 화면을 불러오지 못했습니다"
        description="문의 목록과 답변 이력 데이터를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (!useDemoDataMode && loading) {
    return (
      <AdminStatePage
        title="문의 대응 화면을 불러오는 중입니다"
        description="관리자 문의 목록과 상세 데이터를 가져오고 있습니다."
      />
    );
  }

  return (
    <section className="admin-page">
      <PageHeader
        title="문의 대응"
        description="상태별 문의를 확인하고, 상세 내용과 답변 이력을 보면서 관리자 답변을 작성합니다."
      />

      <div className="admin-card-grid admin-card-grid--three">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
          />
        ))}
      </div>

      <div className="admin-master-detail">
        <section className="admin-panel admin-master-list-panel">
          <div className="admin-panel-head">
            <div>
              <h2>문의 목록</h2>
              <p className="admin-panel-subtitle">
                답변 상태별로 필터링하고 최근 문의부터 확인합니다.
              </p>
            </div>
            <span className="admin-panel-note">{filteredInquiries.length}건 표시</span>
          </div>

          <div className="admin-toolbar">
            <div className="admin-toolbar-group">
              <span className="admin-filter-label">
                <Filter size={14} />
                상태
              </span>
              <button
                type="button"
                className={statusFilter === "all" ? "admin-chip admin-chip--active" : "admin-chip"}
                onClick={() => setStatusFilter("all")}
              >
                전체
              </button>
              <button
                type="button"
                className={statusFilter === "답변전" ? "admin-chip admin-chip--active" : "admin-chip"}
                onClick={() => setStatusFilter("답변전")}
              >
                답변전
              </button>
              <button
                type="button"
                className={statusFilter === "답변완료" ? "admin-chip admin-chip--active" : "admin-chip"}
                onClick={() => setStatusFilter("답변완료")}
              >
                답변완료
              </button>
            </div>
          </div>

          <div className="admin-stack admin-master-list-scroll">
            {filteredInquiries.length > 0 ? (
              filteredInquiries.map((inquiry) => {
                const isSelected = inquiry.id === selectedInquiry?.id;

                return (
                  <button
                    key={inquiry.id}
                    type="button"
                    onClick={() => setSelectedId(inquiry.id)}
                    className={isSelected ? "admin-master-item admin-master-item--active" : "admin-master-item"}
                  >
                    <div className="admin-master-item-head">
                      <strong>{inquiry.id}</strong>
                      <StatusBadge>{inquiry.status}</StatusBadge>
                    </div>
                    <p className="admin-master-item-title">{inquiry.title}</p>
                    <p className="admin-master-item-copy">
                      {inquiry.requester} · {inquiry.company}
                    </p>
                    <div className="admin-master-item-meta">
                      <span>{inquiry.industry}</span>
                      <span>{inquiry.latestResponder}</span>
                      <span>{formatKstDateTime(inquiry.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <AdminStateNotice
                title="조건에 맞는 문의가 없습니다"
                description="다른 상태 필터를 선택하면 문의 목록을 다시 확인할 수 있습니다."
                tone="empty"
              />
            )}
          </div>
        </section>

        <section className="admin-panel">
          {selectedInquiry ? (
            <>
              <div className="admin-panel-head">
                <div>
                  <h2>문의 상세</h2>
                  <p className="admin-panel-subtitle">
                    {selectedInquiry.requester} · {selectedInquiry.company}
                  </p>
                </div>
                <StatusBadge>{selectedInquiry.status}</StatusBadge>
              </div>

              <div className="admin-stack admin-stack--lg">
                <div className="admin-detail-card">
                  <dl className="admin-meta-grid">
                    <div>
                      <dt>문의 제목</dt>
                      <dd>{selectedInquiry.title}</dd>
                    </div>
                    <div>
                      <dt>이메일</dt>
                      <dd>{selectedInquiry.email}</dd>
                    </div>
                    <div>
                      <dt>업종</dt>
                      <dd>{selectedInquiry.industry}</dd>
                    </div>
                    <div>
                      <dt>접수 시각</dt>
                      <dd>{formatKstDateTime(selectedInquiry.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>최근 업데이트</dt>
                      <dd>{formatKstDateTime(selectedInquiry.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt>최근 응답자</dt>
                      <dd>{selectedInquiry.latestResponder}</dd>
                    </div>
                  </dl>
                </div>

                <div className="admin-detail-card">
                  <h3>문의 내용</h3>
                  <p className="admin-detail-copy">{selectedInquiry.content}</p>
                </div>

                <div className="admin-detail-card">
                  <div className="admin-panel-head" style={{ marginBottom: 12 }}>
                    <div>
                      <h2>관리자 답변 작성</h2>
                      <p className="admin-panel-subtitle">
                        답변 저장 시 상태는 자동으로 답변완료로 변경됩니다.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value)}
                    className="admin-textarea app-form-input"
                    rows={6}
                    placeholder="고객에게 전달할 관리자 답변을 입력하세요"
                  />

                  {errorNotice ? (
                    <div className="admin-feedback">{errorNotice}</div>
                  ) : null}

                  {saveNotice ? (
                    <div className="admin-feedback admin-feedback--success">{saveNotice}</div>
                  ) : null}

                  <div className="admin-button-row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                    <button
                      type="button"
                      className="admin-button admin-button--ghost"
                      onClick={() => setReplyDraft("")}
                      disabled={!replyDraft.trim()}
                    >
                      초기화
                    </button>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={handleSubmitReply}
                      disabled={!replyDraft.trim() || savingReply}
                    >
                      <Send size={14} />
                      {savingReply ? "저장 중..." : "답변 저장"}
                    </button>
                  </div>
                </div>

                <div className="admin-detail-card">
                  <div className="admin-panel-head">
                    <div>
                      <h2>답변 이력</h2>
                      <p className="admin-panel-subtitle">
                        문의 접수부터 관리자 답변까지의 기록입니다.
                      </p>
                    </div>
                  </div>

                  <div className="admin-timeline">
                    {detailLoading ? (
                      <AdminStateNotice
                        title="문의 상세를 불러오는 중입니다"
                        description="사용자 문의 내용과 관리자 답변 상태를 확인하고 있습니다."
                        tone="empty"
                      />
                    ) : history.length > 0 ? (
                      history.map((item) => (
                        <article key={`${item.at}-${item.author}`} className="admin-timeline-item">
                          <div className="admin-timeline-marker" />
                          <div className="admin-timeline-content">
                            <div className="admin-timeline-meta">
                              <strong>{item.author}</strong>
                              <span>{item.channel}</span>
                              <span>{formatKstDateTime(item.at)}</span>
                            </div>
                            <p>{item.note}</p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <AdminStateNotice
                        title="답변 이력이 없습니다"
                        description="현재는 문의 접수와 관리자 답변 1건 기준으로 기록을 확인할 수 있습니다."
                        tone="empty"
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <AdminStateNotice
              title="확인할 문의가 없습니다"
              description="왼쪽 목록에서 문의를 선택하면 상세 내용과 답변 이력이 표시됩니다."
              tone="empty"
            />
          )}
        </section>
      </div>
    </section>
  );
}
