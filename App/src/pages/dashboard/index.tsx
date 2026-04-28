import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  Mail,
  Target,
  Link as LinkIcon,
  FileText,
  CalendarDays,
  Video,
  Users,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  getDashboardRecentEmails,
  getDashboardSchedules,
  getDashboardSummary,
  getDashboardWeeklySummary,
} from "../../shared/api/dashboard";
import { getErrorMessage } from "../../shared/api/http";
import { AppStatePage } from "../../shared/ui/primitives/AppStatePage";
import { SectionCard } from "../../shared/ui/primitives/SectionCard";
import { StatePanel } from "../../shared/ui/primitives/StatePanel";
import { StatusBadge } from "../../shared/ui/primitives/StatusBadge";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

type DashboardState = {
  summary: Awaited<ReturnType<typeof getDashboardSummary>> | null;
  schedules: Awaited<ReturnType<typeof getDashboardSchedules>>["schedules"];
  weeklySummary: Awaited<ReturnType<typeof getDashboardWeeklySummary>> | null;
  recentEmails: Awaited<ReturnType<typeof getDashboardRecentEmails>>["emails"];
};

function formatSignedNumber(value: number, suffix = "") {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}${suffix}`;
}

function formatDateLabel(dateTime: string) {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return dateTime;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(dateTime: string) {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function isVideoSchedule(source: string) {
  const normalizedSource = source.toLowerCase();
  return (
    normalizedSource.includes("zoom") ||
    normalizedSource.includes("meet") ||
    normalizedSource.includes("video")
  );
}

function formatDateRange(start: string, end: string) {
  const format = (date: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric",
    }).format(new Date(date));

  return `${format(start)} - ${format(end)}`;
}

function toInboxStatusLabel(status: string) {
  if (status === "AUTO_SENT") {
    return { label: "자동 발송", tone: "success" as const };
  }

  if (status === "PROCESSED") {
    return { label: "처리 완료", tone: "neutral" as const };
  }

  return { label: "검토 대기", tone: "warning" as const };
}

const initialDashboardState: DashboardState = {
  summary: null,
  schedules: [],
  weeklySummary: null,
  recentEmails: [],
};

const demoDashboardState: DashboardState = {
  summary: {
    processed_today: {
      count: 18,
      diff_from_yesterday: 5,
    },
    pending_drafts: {
      count: 3,
    },
    template_matching: {
      rate: 84,
      diff_from_last_week: 9,
    },
    integration_status: {
      status: "CONNECTED",
      connected_email: "demo@gmail.com",
    },
  },
  schedules: [
    {
      event_id: 1,
      title: "그린에너지 파트너십 미팅",
      start_datetime: "2026-03-02T10:00:00",
      end_datetime: "2026-03-02T11:00:00",
      source: "EMAIL",
      status: "PENDING",
      is_calendar_added: false,
    },
    {
      event_id: 2,
      title: "프로젝트 킥오프 화상 미팅",
      start_datetime: "2026-03-03T14:00:00",
      end_datetime: "2026-03-03T15:00:00",
      source: "Google Meet",
      status: "CONFIRMED",
      is_calendar_added: true,
    },
  ],
  weeklySummary: {
    date_range: { start: "2026-02-24", end: "2026-03-02" },
    categories: [
      { category_name: "가격 문의", count: 12, color: "#2DD4BF" },
      { category_name: "일정 조율", count: 7, color: "#38BDF8" },
      { category_name: "파트너십", count: 4, color: "#F59E0B" },
    ],
  },
  recentEmails: [
    {
      email_id: 101,
      sender_name: "박민수",
      sender_company: "테크솔루션",
      subject: "엔터프라이즈 플랜 견적 요청",
      category_name: "가격 문의",
      status: "PENDING_REVIEW",
      received_at: "2026-03-02T09:10:00",
    },
    {
      email_id: 102,
      sender_name: "최영호",
      sender_company: "그린에너지",
      subject: "3월 파트너십 미팅 일정 확인",
      category_name: "일정 조율",
      status: "PROCESSED",
      received_at: "2026-03-02T08:40:00",
    },
    {
      email_id: 103,
      sender_name: "이수진",
      sender_company: "넥스트비즈",
      subject: "도입 상담 후속 안내 요청",
      category_name: "도입 문의",
      status: "AUTO_SENT",
      received_at: "2026-03-01T16:25:00",
    },
  ],
};

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = resolveDemoScenarioId(searchParams.get("scenario"), "dashboard-demo");
  const useDemoDataMode = scenarioId === "dashboard-demo";
  const showFullLoadError =
    scenarioId === "dashboard-load-error" ||
    scenarioId === "global-service-unavailable";
  const showPermissionError = scenarioId === "global-session-expired";
  const showUnexpectedError = scenarioId === "global-unexpected-error";
  const showCalendarPanelError = scenarioId === "dashboard-calendar-panel-error";
  const showEmailPanelError = scenarioId === "dashboard-email-panel-error";
  const [dashboardState, setDashboardState] = useState<DashboardState>(initialDashboardState);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (useDemoDataMode) {
      setDashboardState(demoDashboardState);
      setLoadError("");
      setLoading(false);
      return;
    }

    if (showFullLoadError || showPermissionError || showUnexpectedError) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setLoadError("");

    void Promise.all([
      getDashboardSummary(),
      getDashboardSchedules(),
      getDashboardWeeklySummary(),
      getDashboardRecentEmails(),
    ])
      .then(([summary, schedules, weeklySummary, recentEmails]) => {
        if (!mounted) {
          return;
        }

        setDashboardState({
          summary,
          schedules: schedules.schedules,
          weeklySummary,
          recentEmails: recentEmails.emails,
        });
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setLoadError(getErrorMessage(error, "대시보드 데이터를 불러오지 못했습니다."));
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
  }, [showFullLoadError, showPermissionError, showUnexpectedError, useDemoDataMode]);

  const statCards = useMemo(() => {
    const summary = dashboardState.summary;

    return [
      {
        label: "오늘 처리된 이메일",
        value: `${summary?.processed_today.count ?? 0}`,
        note: `어제 대비 ${formatSignedNumber(summary?.processed_today.diff_from_yesterday ?? 0)}`,
        icon: Mail,
        tone: "teal",
      },
      {
        label: "검토 대기 중인 초안",
        value: `${summary?.pending_drafts.count ?? 0}`,
        note:
          (summary?.pending_drafts.count ?? 0) > 0
            ? "즉시 확인 필요"
            : "없음",
        icon: FileText,
        tone: "amber",
      },
      {
        label: "템플릿 매칭률",
        value: `${Math.round(summary?.template_matching.rate ?? 0)}%`,
        note: `전주 대비 ${formatSignedNumber(
          Math.round(summary?.template_matching.diff_from_last_week ?? 0),
          "%",
        )}`,
        icon: Target,
        tone: "teal",
      },
      {
        label: "이메일 계정 상태",
        value: summary?.integration_status.status ?? "DISCONNECTED",
        note: summary?.integration_status.connected_email ?? "연결된 계정 없음",
        icon: LinkIcon,
        tone: "green",
      },
    ];
  }, [dashboardState.summary]);

  const weeklyData = useMemo(
    () =>
      (dashboardState.weeklySummary?.categories ?? []).map((item) => ({
        name: item.category_name,
        value: item.count,
        color: item.color,
      })),
    [dashboardState.weeklySummary],
  );

  if (showPermissionError) {
    return (
      <AppStatePage
        title="세션이 만료되었습니다"
        description="보안을 위해 세션이 종료되었습니다. 다시 로그인한 뒤 계속 진행해 주세요."
        tone="permission"
        action={
          <Link
            to="/"
            className="app-cta-primary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            로그인으로 이동
          </Link>
        }
      />
    );
  }

  if (showUnexpectedError) {
    return (
      <AppStatePage
        title="예기치 않은 오류가 발생했습니다"
        description="대시보드 데이터를 렌더링하는 중 알 수 없는 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (showFullLoadError || loadError) {
    return (
      <AppStatePage
        title="대시보드를 불러오지 못했습니다"
        description={
          loadError ||
          "요약 지표와 최근 활동 데이터를 가져오는 중 문제가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요."
        }
      />
    );
  }

  if (loading) {
    return (
      <AppStatePage
        title="대시보드를 불러오는 중입니다"
        description="요약 지표와 최근 활동 데이터를 가져오고 있습니다."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-card ${
              card.tone === "amber" && (dashboardState.summary?.pending_drafts.count ?? 0) > 0
                ? "border-[#FDE68A] dark:border-[#4A3417] dark:bg-[#17120D]"
                : "border-[#E2E8F0] dark:border-border"
            }`}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]">
              <card.icon className="h-5 w-5 text-[#1E2A3A] dark:text-foreground" />
            </div>
            <p className="text-2xl font-semibold text-[#1E2A3A] dark:text-foreground">{card.value}</p>
            <p className="mt-1 text-sm text-[#64748B] dark:text-muted-foreground">{card.label}</p>
            <p
              className={`mt-2 text-xs ${
                card.tone === "amber" && (dashboardState.summary?.pending_drafts.count ?? 0) > 0
                  ? "text-[#D97706] dark:text-[#F4C98A]"
                  : "text-[#94A3B8] dark:text-muted-foreground"
              }`}
            >
              {card.note}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <SectionCard
            title="다가오는 일정"
            action={
              <Link
                to="/app/calendar"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0F766E]"
              >
                캘린더 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {showCalendarPanelError ? (
              <StatePanel
                title="일정 데이터를 불러오지 못했습니다"
                description="다가오는 일정 패널 응답이 지연되고 있습니다. 캘린더 화면에서 다시 확인해 주세요."
              />
            ) : (dashboardState.schedules ?? []).length === 0 ? (
              <StatePanel
                title="예정된 일정이 없습니다"
                description="확정되거나 등록 대기 중인 일정이 아직 없습니다."
                tone="empty"
              />
            ) : (
              <div className="space-y-3">
                {(dashboardState.schedules ?? []).map((event) => (
                  <div
                    key={event.event_id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#E2E8F0] px-4 py-4"
                  >
                    <div className="h-12 w-1 rounded-full bg-[#2DD4BF]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {event.email_id ? (
                          <Link
                            to={`/app/inbox/${event.email_id}`}
                            className="text-sm font-medium text-[#1E2A3A] underline-offset-4 hover:underline"
                          >
                            {event.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-[#1E2A3A]">{event.title}</p>
                        )}
                        {event.status !== "CONFIRMED" ? (
                          <StatusBadge label="등록 대기" tone="warning" />
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDateLabel(event.start_datetime)} {formatTimeLabel(event.start_datetime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {isVideoSchedule(event.source) ? (
                            <Video className="h-3.5 w-3.5" />
                          ) : (
                            <Users className="h-3.5 w-3.5" />
                          )}
                          {event.source}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="최근 수신 이메일"
            action={
              <Link
                to="/app/inbox"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0F766E]"
              >
                전체 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {showEmailPanelError ? (
              <StatePanel
                title="최근 메일 패널을 표시할 수 없습니다"
                description="수신 메일 목록 응답을 확인하지 못했습니다. 수신함에서 전체 목록을 확인해 주세요."
              />
            ) : (dashboardState.recentEmails ?? []).length === 0 ? (
              <StatePanel
                title="최근 수신 이메일이 없습니다"
                description="표시할 최근 메일이 아직 없습니다."
                tone="empty"
              />
            ) : (
              <div className="space-y-3">
                {(dashboardState.recentEmails ?? []).slice(0, 4).map((email) => {
                  const statusMeta = toInboxStatusLabel(email.status);

                  return (
                    <div
                      key={email.email_id}
                      className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#E2E8F0] px-4 py-4"
                    >
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1E2A3A] text-sm font-semibold text-white">
                        {email.sender_name.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1E2A3A]">
                          {email.sender_name}
                          {email.sender_company ? ` · ${email.sender_company}` : ""}
                        </p>
                        <p className="mt-1 truncate text-sm text-[#64748B]">{email.subject}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {email.category_name ? (
                          <StatusBadge label={email.category_name} tone="teal" />
                        ) : null}
                        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="이번 주 요약"
          description={
            dashboardState.weeklySummary
              ? formatDateRange(
                  dashboardState.weeklySummary.date_range.start,
                  dashboardState.weeklySummary.date_range.end,
                )
              : undefined
          }
        >
          {weeklyData.length === 0 ? (
            <StatePanel
              title="이번 주 요약 데이터가 없습니다"
              description="카테고리별 집계가 아직 없습니다."
              tone="empty"
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="mx-auto h-[220px] w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={weeklyData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {weeklyData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {weeklyData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-[#1E2A3A]">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-[#64748B]">{item.value}건</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
