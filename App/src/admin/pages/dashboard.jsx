import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  getAdminDashboardSummary,
  getAdminDomainDistribution,
  getAdminEmailVolume,
  getAdminSupportTickets,
  getAdminWeeklyTrend,
} from "../../shared/api/admin";
import { getErrorMessage } from "../../shared/api/http";
import { MetricCard } from "../shared/ui/MetricCard";
import { PageHeader } from "../shared/ui/PageHeader";
import { AdminStateNotice } from "../shared/ui/AdminStateNotice";
import { AdminStatePage } from "../shared/ui/AdminStatePage";
import { StatusBadge } from "../shared/ui/StatusBadge";

function formatDateLabel(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function getRecentDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);

  const toDateString = (date) => date.toISOString().slice(0, 10);

  return {
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
  };
}

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = searchParams.get("scenario");
  const loadErrorScenario = scenarioId === "admin-dashboard-load-error";
  const trendErrorScenario =
    scenarioId === "admin-dashboard-trend-error" ||
    scenarioId === "admin-dashboard-queue-error";
  const permissionScenario = scenarioId === "admin-permission-denied";
  const unexpectedScenario = scenarioId === "admin-unexpected-error";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState(null);
  const [emailVolume, setEmailVolume] = useState([]);
  const [domainDistribution, setDomainDistribution] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  useEffect(() => {
    if (loadErrorScenario || permissionScenario || unexpectedScenario) {
      setLoading(false);
      return;
    }

    const { startDate, endDate } = getRecentDateRange();
    let mounted = true;
    setLoading(true);
    setLoadError("");

    void Promise.all([
      getAdminDashboardSummary(),
      getAdminEmailVolume(startDate, endDate),
      getAdminDomainDistribution(5),
      getAdminWeeklyTrend(),
      getAdminSupportTickets(3),
    ])
      .then(([nextSummary, nextEmailVolume, nextDomainDistribution, nextWeeklyTrend, nextTickets]) => {
        if (!mounted) {
          return;
        }

        setSummary(nextSummary);
        setEmailVolume(nextEmailVolume);
        setDomainDistribution(nextDomainDistribution);
        setWeeklyTrend(nextWeeklyTrend);
        setRecentTickets(nextTickets);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setLoadError(getErrorMessage(error, "운영 대시보드를 불러오지 못했습니다."));
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
  }, [loadErrorScenario, permissionScenario, unexpectedScenario]);

  const dashboardMetrics = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        label: "전체 사용자",
        value: `${summary.total_users}명`,
        hint: "가입된 전체 계정 수",
      },
      {
        label: "Gmail 연동 사용자",
        value: `${summary.gmail_connected_users}명`,
        hint: "메일 연동 완료 계정",
      },
      {
        label: "Calendar 연동 사용자",
        value: `${summary.calendar_connected_users}명`,
        hint: "일정 연동 완료 계정",
      },
      {
        label: "오늘 분석된 메일",
        value: `${summary.today_analyzed_emails}건`,
        hint: "오늘 분석 완료 건수",
      },
      {
        label: "오늘 생성된 초안",
        value: `${summary.today_generated_drafts}건`,
        hint: "오늘 초안 생성 건수",
      },
      {
        label: "전체 문의",
        value: `${summary.total_support_tickets}건`,
        hint: "누적 관리자 문의 건수",
      },
    ];
  }, [summary]);

  const maxProcessed = useMemo(
    () => Math.max(...emailVolume.map((item) => item.count), 1),
    [emailVolume],
  );
  const maxTrendProcessed = useMemo(
    () => Math.max(...weeklyTrend.map((item) => item.received_count), 1),
    [weeklyTrend],
  );
  const totalDomainCount = useMemo(
    () => domainDistribution.reduce((sum, item) => sum + item.count, 0),
    [domainDistribution],
  );

  if (permissionScenario) {
    return (
      <AdminStatePage
        title="이 화면을 볼 권한이 없습니다"
        description="운영 대시보드 접근 권한이 없는 계정입니다. 관리자에게 권한을 요청해 주세요."
        tone="permission"
      />
    );
  }

  if (unexpectedScenario) {
    return (
      <AdminStatePage
        title="예기치 않은 오류가 발생했습니다"
        description="운영 대시보드 데이터를 렌더링하는 중 알 수 없는 문제가 발생했습니다."
      />
    );
  }

  if (loadErrorScenario || loadError) {
    return (
      <AdminStatePage
        title="운영 대시보드를 불러오지 못했습니다"
        description={loadError || "운영 지표와 메일 처리 통계를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."}
      />
    );
  }

  if (loading) {
    return (
      <AdminStatePage
        title="운영 대시보드를 불러오는 중입니다"
        description="운영 지표와 메일 처리 통계를 가져오고 있습니다."
      />
    );
  }

  return (
    <section className="admin-page">
      <PageHeader
        title="운영 대시보드"
        description="가입자 현황, 메일 처리량, 초안 생성 추이, 최근 문의 접수 현황을 한 화면에서 확인합니다."
      />

      <div className="admin-card-grid admin-card-grid--five">
        {dashboardMetrics.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
          />
        ))}
      </div>

      <div className="admin-split-grid">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>기간별 메일 처리량</h2>
              <p className="admin-panel-subtitle">
                최근 7일 기준으로 백엔드가 집계한 일자별 메일 처리량입니다.
              </p>
            </div>
            <span className="admin-panel-note">최근 7일</span>
          </div>

          <div className="admin-stack">
            {emailVolume.map((item) => (
              <article key={item.date} className="admin-bar-row">
                <div className="admin-bar-meta">
                  <strong>{formatDateLabel(item.date)}</strong>
                  <span>총 {item.count}건</span>
                </div>
                <div className="admin-bar-track">
                  <div
                    className="admin-bar-fill"
                    style={{ width: `${(item.count / maxProcessed) * 100}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>도메인별 이메일 분포</h2>
              <p className="admin-panel-subtitle">
                주요 수신 도메인별 비중과 처리 건수를 확인합니다.
              </p>
            </div>
            <span className="admin-panel-note">상위 5개</span>
          </div>

          <div className="admin-stack">
            {domainDistribution.map((item, index) => {
              const share = totalDomainCount > 0 ? Math.round((item.count / totalDomainCount) * 100) : 0;
              const colors = ["teal", "blue", "purple", "amber", "rose"];
              const color = colors[index % colors.length];

              return (
                <article key={item.domain} className="admin-list-card">
                  <div className="admin-list-card-row">
                    <div>
                      <h3>{item.domain}</h3>
                      <p>{item.count}건</p>
                    </div>
                    <strong>{share}%</strong>
                  </div>
                  <div className="admin-progress">
                    <div
                      className={`admin-progress-bar admin-progress-bar--${color}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <div className="admin-split-grid">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>최근 7일 처리 추이</h2>
              <p className="admin-panel-subtitle">
                일자별 수신량과 초안 생성량을 세로 막대로 요약합니다.
              </p>
            </div>
            <span className="admin-panel-note">수신량 / 초안량</span>
          </div>

          {trendErrorScenario ? (
            <AdminStateNotice
              title="최근 처리 추이를 불러오지 못했습니다"
              description="시계열 통계 패널 응답이 지연되고 있습니다. 잠시 후 다시 확인해 주세요."
            />
          ) : (
            <div className="admin-mini-chart">
              {weeklyTrend.map((item) => (
                <div key={item.date} className="admin-mini-chart-item">
                  <div className="admin-mini-chart-column">
                    <div
                      className="admin-mini-chart-bar"
                      style={{
                        height: `${Math.max((item.received_count / maxTrendProcessed) * 180, 36)}px`,
                      }}
                    />
                  </div>
                  <strong>{formatDateLabel(item.date)}</strong>
                  <span>수신 {item.received_count}건</span>
                  <span>초안 {item.draft_count}건</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>최근 문의 접수</h2>
              <p className="admin-panel-subtitle">
                운영팀이 빠르게 확인해야 하는 최신 문의를 요약합니다.
              </p>
            </div>
            <span className="admin-panel-note">최근 3건</span>
          </div>

          <div className="admin-stack">
            {recentTickets.map((ticket) => (
              <article key={ticket.ticketId} className="admin-list-card">
                <div className="admin-list-card-row">
                  <div>
                    <h3>{ticket.title}</h3>
                    <p>사용자 ID {ticket.userId}</p>
                  </div>
                  <StatusBadge>{ticket.status}</StatusBadge>
                </div>
                <div className="admin-inline-stat-row">
                  <span>문의 #{ticket.ticketId}</span>
                  <strong>{ticket.createdAt}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
