import { useEffect, useMemo, useState } from "react";
import { Link2Off, Power, Search } from "lucide-react";
import { useSearchParams } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../app/components/ui/select";
import {
  deleteAdminUserIntegration,
  getAdminUserDetail,
  getAdminUsers,
  updateAdminUserStatus,
} from "../../shared/api/admin";
import { getErrorMessage } from "../../shared/api/http";
import { adminUsers, userIndustryOptions } from "../shared/mock/adminData";
import { MetricCard } from "../shared/ui/MetricCard";
import { PageHeader } from "../shared/ui/PageHeader";
import { AdminModal } from "../shared/ui/AdminModal";
import { AdminStateNotice } from "../shared/ui/AdminStateNotice";
import { AdminStatePage } from "../shared/ui/AdminStatePage";
import { StatusBadge } from "../shared/ui/StatusBadge";

export function UsersPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = searchParams.get("scenario");
  const loadErrorScenario =
    scenarioId === "admin-users-load-error" || scenarioId === "admin-members-load-error";
  const emptyScenario =
    scenarioId === "admin-users-empty" || scenarioId === "admin-members-empty";
  const actionErrorScenario = scenarioId === "admin-users-action-error";
  const statusDialogScenario = scenarioId === "admin-users-status-dialog-normal";
  const googleDialogScenario = scenarioId === "admin-users-google-dialog-normal";
  const useDemoDataMode = Boolean(scenarioId?.startsWith("admin-"));

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [googleFilter, setGoogleFilter] = useState("all");
  const [users, setUsers] = useState(useDemoDataMode && !emptyScenario ? adminUsers : []);
  const [selectedUserId, setSelectedUserId] = useState(
    (useDemoDataMode && !emptyScenario ? adminUsers : [])[0]?.id ?? "",
  );
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [dismissPresetModal, setDismissPresetModal] = useState(false);
  const [loading, setLoading] = useState(!useDemoDataMode);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionErrorNotice, setActionErrorNotice] = useState(
    actionErrorScenario
      ? "계정 상태 변경 또는 Google 강제 해제 요청을 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      : "",
  );

  useEffect(() => {
    if (useDemoDataMode) {
      if (emptyScenario) {
        setUsers([]);
        setSelectedUserId("");
        return;
      }

      setUsers(adminUsers);
      setSelectedUserId((current) => current || adminUsers[0]?.id || "");
      return;
    }

    let mounted = true;
    setLoading(true);
    setLoadError("");

    void getAdminUsers(100)
      .then((nextUsers) => {
        if (!mounted) {
          return;
        }

        const mappedUsers = nextUsers.map((user) => ({
          id: user.userId,
          name: user.name,
          email: user.email,
          company: "상세 조회 후 표시",
          industry: user.industryType ?? "",
          industryLabel:
            userIndustryOptions.find((option) => option.value === user.industryType)?.label ??
            user.industryType ??
            "미지정",
          role: "사용자",
          status: user.active ? "활성" : "비활성",
          googleStatus: "확인 중",
          googleEmail: null,
          joinedAt: user.createdAt,
          lastActive: "상세 조회 후 표시",
          processedEmails: 0,
          generatedDrafts: 0,
          inquiryCount: 0,
          recentInquiries: [],
        }));

        setUsers(mappedUsers);
        setSelectedUserId((current) => current || mappedUsers[0]?.id || "");
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setLoadError(getErrorMessage(error, "사용자 목록을 불러오지 못했습니다."));
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

  useEffect(() => {
    setActionErrorNotice(
      actionErrorScenario
        ? "계정 상태 변경 또는 Google 강제 해제 요청을 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
        : "",
    );
  }, [actionErrorScenario]);

  useEffect(() => {
    if (useDemoDataMode || !selectedUserId) {
      setSelectedUserDetail(null);
      return;
    }

    let mounted = true;
    setDetailLoading(true);
    setActionErrorNotice("");

    void getAdminUserDetail(selectedUserId)
      .then((detail) => {
        if (!mounted) {
          return;
        }

        const mappedDetail = {
          id: detail.userId,
          name: detail.name,
          email: detail.email,
          company: detail.companyDesc || "회사 설명 미등록",
          industry: detail.industryType ?? "",
          industryLabel:
            userIndustryOptions.find((option) => option.value === detail.industryType)?.label ??
            detail.industryType ??
            "미지정",
          role: detail.role,
          status: detail.active ? "활성" : "비활성",
          googleStatus: detail.gmailConnected ? "연동 완료" : "미연동",
          googleEmail: detail.integratedEmail,
          joinedAt: "",
          lastActive: detail.lastLoginAt ?? detail.lastSyncAt ?? "기록 없음",
          processedEmails: detail.totalProcessedEmails,
          generatedDrafts: detail.totalGeneratedDrafts,
          inquiryCount: detail.recentTicketCount,
          recentInquiries: [],
        };

        setSelectedUserDetail(mappedDetail);
        setUsers((current) =>
          current.map((user) => (user.id === mappedDetail.id ? { ...user, ...mappedDetail } : user)),
        );
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setActionErrorNotice(getErrorMessage(error, "사용자 상세 정보를 불러오지 못했습니다."));
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
  }, [selectedUserId, useDemoDataMode]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesKeyword =
        keyword.length === 0 ||
        [user.name, user.email, user.company, user.industryLabel]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesIndustry = industry === "all" || user.industry === industry;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      const matchesGoogle =
        googleFilter === "all" || user.googleStatus === googleFilter;

      return matchesKeyword && matchesIndustry && matchesStatus && matchesGoogle;
    });
  }, [googleFilter, industry, search, statusFilter, users]);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId("");
      return;
    }

    if (!filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser =
    selectedUserDetail?.id === selectedUserId
      ? selectedUserDetail
      : filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;
  const presetConfirmAction =
    !dismissPresetModal &&
    selectedUser &&
    (statusDialogScenario || googleDialogScenario || actionErrorScenario)
      ? {
          type: googleDialogScenario ? "unlink-google" : "toggle-status",
          user: selectedUser,
        }
      : null;
  const activeConfirmAction = confirmAction ?? presetConfirmAction;

  const summaryCards = useMemo(
    () => [
      {
        label: "전체 사용자",
        value: `${users.length}명`,
        hint: "관리자 콘솔 기준 가입 계정",
      },
      {
        label: "활성 계정",
        value: `${users.filter((user) => user.status === "활성").length}명`,
        hint: "비활성 제외",
      },
      {
        label: "Google 연동 완료",
        value: `${users.filter((user) => user.googleStatus === "연동 완료").length}명`,
        hint: "메일 연동 가능 계정",
      },
      {
        label: "오늘 생성 초안",
        value: `${users.reduce((sum, user) => sum + user.generatedDrafts, 0)}건`,
        hint: "사용자 누적 초안 생성 수",
      },
    ],
    [users],
  );

  const executeConfirmAction = () => {
    if (!activeConfirmAction) {
      return;
    }

    if (actionErrorScenario) {
      setConfirmAction(null);
      setDismissPresetModal(true);
      return;
    }

    const applyLocalChange = () => {
      if (activeConfirmAction.type === "toggle-status") {
        setUsers((current) =>
          current.map((user) =>
            user.id === activeConfirmAction.user.id
              ? {
                  ...user,
                  status: user.status === "활성" ? "비활성" : "활성",
                  lastActive: user.status === "활성" ? "방금 비활성화" : "방금 활성화",
                }
              : user,
          ),
        );
      }

      if (activeConfirmAction.type === "unlink-google") {
        setUsers((current) =>
          current.map((user) =>
            user.id === activeConfirmAction.user.id
              ? {
                  ...user,
                  googleStatus: "미연동",
                  googleEmail: null,
                }
              : user,
          ),
        );
      }
    };

    if (useDemoDataMode) {
      applyLocalChange();
      setConfirmAction(null);
      setDismissPresetModal(true);
      return;
    }

    setActionLoading(true);
    setActionErrorNotice("");

    const request =
      activeConfirmAction.type === "toggle-status"
        ? updateAdminUserStatus(
            activeConfirmAction.user.id,
            activeConfirmAction.user.status !== "활성",
          )
        : deleteAdminUserIntegration(activeConfirmAction.user.id);

    void request
      .then(() => {
        applyLocalChange();
        setSelectedUserDetail(null);
        setConfirmAction(null);
        setDismissPresetModal(true);
      })
      .catch((error) => {
        setActionErrorNotice(getErrorMessage(error, "사용자 운영 액션을 처리하지 못했습니다."));
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  if (loadErrorScenario) {
    return (
      <AdminStatePage
        title="사용자 관리 화면을 불러오지 못했습니다"
        description="사용자 목록과 상세 운영 데이터를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (loadError) {
    return (
      <AdminStatePage
        title="사용자 관리 화면을 불러오지 못했습니다"
        description={loadError}
      />
    );
  }

  if (loading) {
    return (
      <AdminStatePage
        title="사용자 관리 화면을 불러오는 중입니다"
        description="사용자 목록과 연동 상태 데이터를 가져오고 있습니다."
      />
    );
  }

  return (
    <section className="admin-page">
      <PageHeader
        title="사용자 관리"
        description="사용자 목록 조회, 업종 검색, 계정 활성/비활성, Google 연동 상태 관리를 한 화면에서 처리합니다."
      />

      <div className="admin-card-grid admin-card-grid--four">
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
              <h2>사용자 목록</h2>
              <p className="admin-panel-subtitle">
                이름, 이메일, 업종 기준으로 사용자를 빠르게 찾습니다.
              </p>
            </div>
            <span className="admin-panel-note">{filteredUsers.length}명 표시</span>
          </div>

          <div className="admin-toolbar">
            <div className="admin-toolbar-group">
              <div className="admin-input-wrap app-input-shell">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="admin-input admin-input--compact bg-transparent text-sm placeholder:text-muted-foreground"
                  placeholder="이름 / 이메일 / 회사 검색"
                />
              </div>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="app-form-input h-11 min-w-[148px] rounded-xl px-4 text-sm">
                  <SelectValue placeholder="전체 업종" />
                </SelectTrigger>
                <SelectContent className="app-select-content rounded-2xl p-1">
                  <SelectItem value="all" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                    전체 업종
                  </SelectItem>
                  {userIndustryOptions.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className="app-select-item rounded-xl px-3 py-2.5 text-sm"
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="app-form-input h-11 min-w-[132px] rounded-xl px-4 text-sm">
                  <SelectValue placeholder="전체 상태" />
                </SelectTrigger>
                <SelectContent className="app-select-content rounded-2xl p-1">
                  <SelectItem value="all" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                    전체 상태
                  </SelectItem>
                  <SelectItem value="활성" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                    활성
                  </SelectItem>
                  <SelectItem value="비활성" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                    비활성
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={googleFilter} onValueChange={setGoogleFilter}>
                <SelectTrigger className="app-form-input h-11 min-w-[156px] rounded-xl px-4 text-sm">
                  <SelectValue placeholder="전체 연동 상태" />
                </SelectTrigger>
                <SelectContent className="app-select-content rounded-2xl p-1">
                  <SelectItem value="all" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                    전체 연동 상태
                  </SelectItem>
                  <SelectItem value="연동 완료" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                    연동 완료
                  </SelectItem>
                  <SelectItem value="미연동" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                    미연동
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="admin-stack admin-master-list-scroll">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSelected = user.id === selectedUser?.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    className={isSelected ? "admin-master-item admin-master-item--active" : "admin-master-item"}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="admin-master-item-head">
                      <strong>{user.name}</strong>
                      <StatusBadge>{user.status}</StatusBadge>
                    </div>
                    <p className="admin-master-item-title">{user.company}</p>
                    <p className="admin-master-item-copy">{user.email}</p>
                    <div className="admin-master-item-meta">
                      <span>{user.industryLabel}</span>
                      <span>{user.googleStatus}</span>
                      <span>{user.lastActive}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <AdminStateNotice
                title="조건에 맞는 사용자가 없습니다"
                description="검색어나 업종 필터를 조정하면 다른 사용자를 확인할 수 있습니다."
                tone="empty"
              />
            )}
          </div>
        </section>

        <section className="admin-panel">
          {selectedUser ? (
            <>
              <div className="admin-panel-head">
                <div>
                  <h2>사용자 상세</h2>
                  <p className="admin-panel-subtitle">
                    {selectedUser.name} · {selectedUser.company}
                  </p>
                </div>
                <div className="admin-button-row">
                  <button
                    type="button"
                    className="admin-button admin-button--ghost"
                    onClick={() => setConfirmAction({ type: "unlink-google", user: selectedUser })}
                    disabled={selectedUser.googleStatus !== "연동 완료"}
                  >
                    <Link2Off size={14} />
                    Google 강제 해제
                  </button>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => setConfirmAction({ type: "toggle-status", user: selectedUser })}
                  >
                    <Power size={14} />
                    {selectedUser.status === "활성" ? "비활성 처리" : "활성 처리"}
                  </button>
                </div>
              </div>

              <div className="admin-stack admin-stack--lg">
                {actionErrorNotice ? (
                  <AdminStateNotice
                    title="사용자 운영 액션을 처리하지 못했습니다"
                    description={actionErrorNotice}
                    tone="error"
                  />
                ) : null}

                {detailLoading ? (
                  <AdminStateNotice
                    title="사용자 상세 정보를 불러오는 중입니다"
                    description="선택한 사용자의 상세 정보와 Google 연동 상태를 확인하고 있습니다."
                    tone="empty"
                    compact
                  />
                ) : null}

                <div className="admin-detail-card">
                  <dl className="admin-meta-grid">
                    <div>
                      <dt>이름</dt>
                      <dd>{selectedUser.name}</dd>
                    </div>
                    <div>
                      <dt>이메일</dt>
                      <dd>{selectedUser.email}</dd>
                    </div>
                    <div>
                      <dt>회사</dt>
                      <dd>{selectedUser.company}</dd>
                    </div>
                    <div>
                      <dt>업종</dt>
                      <dd>{selectedUser.industryLabel}</dd>
                    </div>
                    <div>
                      <dt>역할</dt>
                      <dd>{selectedUser.role}</dd>
                    </div>
                    <div>
                      <dt>가입일</dt>
                      <dd>{selectedUser.joinedAt}</dd>
                    </div>
                  </dl>
                </div>

                <div className="admin-detail-card">
                  <div className="admin-list-card-row">
                    <div>
                      <h3>연동 상태</h3>
                      <p className="admin-panel-copy">
                        Google 계정 연동 여부와 연결된 이메일을 확인합니다.
                      </p>
                    </div>
                    <StatusBadge>{selectedUser.googleStatus}</StatusBadge>
                  </div>
                  <div className="admin-inline-stat-grid">
                    <article className="admin-inline-stat-card">
                      <span>계정 상태</span>
                      <strong>{selectedUser.status}</strong>
                    </article>
                    <article className="admin-inline-stat-card">
                      <span>Google 연동 이메일</span>
                      <strong>{selectedUser.googleEmail ?? "연결된 계정 없음"}</strong>
                    </article>
                  </div>
                </div>

                <div className="admin-inline-stat-grid">
                  <article className="admin-inline-stat-card">
                    <span>최근 처리한 이메일 수</span>
                    <strong>{selectedUser.processedEmails}건</strong>
                  </article>
                  <article className="admin-inline-stat-card">
                    <span>생성된 초안 수</span>
                    <strong>{selectedUser.generatedDrafts}건</strong>
                  </article>
                  <article className="admin-inline-stat-card">
                    <span>최근 문의 내역</span>
                    <strong>{selectedUser.inquiryCount}건</strong>
                  </article>
                </div>

                <div className="admin-detail-card">
                  <div className="admin-panel-head">
                    <div>
                      <h2>최근 문의 내역</h2>
                      <p className="admin-panel-subtitle">
                        최근에 접수된 관리자 문의 내역과 처리 상태입니다.
                      </p>
                    </div>
                  </div>

                  {selectedUser.recentInquiries.length > 0 ? (
                    <div className="admin-stack">
                      {selectedUser.recentInquiries.map((inquiry) => (
                        <article key={inquiry.id} className="admin-list-card">
                          <div className="admin-list-card-row">
                            <div>
                              <h3>{inquiry.title}</h3>
                              <p>{inquiry.id}</p>
                            </div>
                            <StatusBadge>{inquiry.status}</StatusBadge>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <AdminStateNotice
                      title="최근 문의 내역이 없습니다"
                      description="이 사용자는 아직 관리자 문의를 접수하지 않았습니다."
                      tone="empty"
                      compact
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <AdminStateNotice
              title="선택된 사용자가 없습니다"
              description="왼쪽 목록에서 사용자를 선택하면 상세 정보와 운영 액션이 표시됩니다."
              tone="empty"
            />
          )}
        </section>
      </div>

      <AdminModal
        open={Boolean(activeConfirmAction)}
        title={
          activeConfirmAction?.type === "unlink-google"
            ? "Google 연동을 강제 해제할까요?"
            : "계정 상태를 변경할까요?"
        }
        description={
          activeConfirmAction?.type === "unlink-google"
            ? "사용자의 Gmail 연동을 즉시 해제하고, 다음 동기화부터 연동이 중단됩니다."
            : "사용자 계정을 활성 또는 비활성 상태로 변경합니다."
        }
        onClose={() => {
          setConfirmAction(null);
          setDismissPresetModal(true);
        }}
        footer={
          <>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => setConfirmAction(null)}
            >
              취소
            </button>
            <button type="button" className="admin-button" onClick={executeConfirmAction} disabled={actionLoading}>
              {actionLoading ? "처리 중..." : "확인"}
            </button>
          </>
        }
      >
        {activeConfirmAction ? (
          <div className="admin-stack">
            <div className="admin-list-card">
              <div className="admin-list-card-row">
                <div>
                  <h3>{activeConfirmAction.user.name}</h3>
                  <p>{activeConfirmAction.user.email}</p>
                </div>
                <StatusBadge>{activeConfirmAction.user.status}</StatusBadge>
              </div>
            </div>
            {actionErrorScenario ? (
              <AdminStateNotice
                title="운영 액션 요청이 실패했습니다"
                description="현재 사용자의 상태를 갱신하지 못했습니다. 잠시 후 다시 시도해 주세요."
                tone="error"
                compact
              />
            ) : null}
            <p className="admin-modal-copy">
              {activeConfirmAction.type === "unlink-google"
                ? "강제 해제 후에는 사용자가 다시 OAuth를 완료하기 전까지 Gmail 처리 작업을 수행할 수 없습니다."
                : activeConfirmAction.user.status === "활성"
                ? "비활성 처리된 사용자는 로그인과 메일 처리 기능을 사용할 수 없습니다."
                : "다시 활성 처리하면 기존 계정 정보와 통계는 그대로 유지됩니다."}
            </p>
          </div>
        ) : null}
      </AdminModal>
    </section>
  );
}
