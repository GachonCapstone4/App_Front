import { useEffect, useState } from "react";
import { Activity, FileSearch, ListChecks, Play, Search } from "lucide-react";
import {
  executeAdminNetworkDictJob,
  getAdminOperationJobDetail,
  getAdminOperationJobError,
  getAdminOperationJobSummary,
  getAdminOperationJobs,
} from "../../shared/api/admin";
import { getErrorMessage } from "../../shared/api/http";
import { subscribeAppEvent } from "../../shared/lib/app-event-stream";
import { PageHeader } from "../shared/ui/PageHeader";
import { AdminStateNotice } from "../shared/ui/AdminStateNotice";

const requestButtons = [
  {
    id: "summary",
    label: "작업 요약 조회",
    description: "대기, 성공, 실패 작업 수를 확인합니다.",
    icon: Activity,
  },
  {
    id: "recent-jobs",
    label: "최근 작업 목록",
    description: "최근 메일 처리 작업 20건을 조회합니다.",
    icon: ListChecks,
  },
  {
    id: "job-detail",
    label: "작업 상세 조회",
    description: "입력한 outbox ID의 payload와 처리 상태를 봅니다.",
    icon: Search,
    needsJobId: true,
  },
  {
    id: "job-error",
    label: "실패 원인 조회",
    description: "실패한 outbox ID의 fail_reason을 확인합니다.",
    icon: FileSearch,
    needsJobId: true,
  },
  {
    id: "network-dict",
    label: "네트워크 사전 Job 실행",
    description: "Kubernetes 네트워크 사전 Job을 실행합니다. 실제 점검 결과는 network_test SSE 이벤트로 수신합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "network-test-stream",
    label: "SSE 네트워크 로그 수신 시작",
    description: "RabbitMQ에서 SSE Pod를 거쳐 전달되는 network_test 이벤트를 로그창에 실시간으로 표시합니다.",
    icon: Activity,
    togglesStream: true,
  },
];

function createLogEntry({ title, endpoint, method, startedAt, status, data, error }) {
  const body = {
    title,
    request: {
      method,
      endpoint,
      requested_at: startedAt,
    },
    response: {
      status,
      received_at: new Date().toISOString(),
      data,
      error,
    },
  };

  return {
    id: `${startedAt}-${title}-${status}`,
    title,
    endpoint,
    method,
    status,
    requestedAt: startedAt,
    receivedAt: body.response.received_at,
    output: JSON.stringify(body, null, 2),
  };
}

export function InternalMonitoringPage() {
  const [jobId, setJobId] = useState("");
  const [activeRequestId, setActiveRequestId] = useState("");
  const [focusedButtonId, setFocusedButtonId] = useState("summary");
  const [networkStreamEnabled, setNetworkStreamEnabled] = useState(false);
  const [logs, setLogs] = useState([]);
  const focusedButton =
    requestButtons.find((button) => button.id === focusedButtonId) ?? requestButtons[0];

  const appendLog = (entry) => {
    setLogs((current) => [entry, ...current].slice(0, 20));
  };

  const renderRequestButton = (button) => (
    <button
      key={button.id}
      type="button"
      className={
        button.dangerous || (button.id === "network-test-stream" && networkStreamEnabled)
          ? "admin-request-card admin-request-card--accent"
          : "admin-request-card"
      }
      onClick={() => void runRequest(button)}
      onFocus={() => setFocusedButtonId(button.id)}
      onMouseEnter={() => setFocusedButtonId(button.id)}
      disabled={Boolean(activeRequestId) && button.id !== "network-test-stream"}
      title={button.description}
    >
      <button.icon size={18} />
      <span>
        <strong>
          {button.id === "network-test-stream" && networkStreamEnabled
            ? "SSE 네트워크 로그 수신 중지"
            : button.label}
        </strong>
      </span>
    </button>
  );

  useEffect(() => {
    if (!networkStreamEnabled) {
      return undefined;
    }

    return subscribeAppEvent("network_test", (payload) => {
      const receivedAt = new Date().toISOString();
      setLogs((current) => [
        createLogEntry({
          title: `network_test ${payload.stage ?? "event"}`,
          endpoint: "event: network_test",
          method: "SSE",
          startedAt: payload.timestamp ?? receivedAt,
          status: "SUCCESS",
          data: payload,
          error: null,
        }),
        ...current,
      ].slice(0, 20));
    });
  }, [networkStreamEnabled]);

  const runRequest = async (button) => {
    if (button.id === "network-test-stream") {
      const nextEnabled = !networkStreamEnabled;
      const startedAt = new Date().toISOString();
      setNetworkStreamEnabled(nextEnabled);
      appendLog(
        createLogEntry({
          title: nextEnabled ? "SSE 네트워크 로그 수신 시작" : "SSE 네트워크 로그 수신 중지",
          endpoint: "event: network_test",
          method: "SSE",
          startedAt,
          status: nextEnabled ? "SUCCESS" : "SKIPPED",
          data: {
            event: "network_test",
            enabled: nextEnabled,
          },
          error: null,
        }),
      );
      return;
    }

    if (button.needsJobId && !jobId.trim()) {
      appendLog(
        createLogEntry({
          title: button.label,
          endpoint: "/api/admin/operations/jobs/{job_id}",
          method: "GET",
          startedAt: new Date().toISOString(),
          status: "SKIPPED",
          data: null,
          error: "outbox ID를 입력한 뒤 다시 요청해 주세요.",
        }),
      );
      return;
    }

    const trimmedJobId = jobId.trim();
    const startedAt = new Date().toISOString();
    setActiveRequestId(button.id);
    let endpoint = "";
    let method = "GET";

    try {
      let data;

      if (button.id === "summary") {
        endpoint = "/api/admin/operations/jobs/summary";
        data = await getAdminOperationJobSummary();
      }

      if (button.id === "recent-jobs") {
        endpoint = "/api/admin/operations/jobs?page=1&size=20";
        data = await getAdminOperationJobs(20);
      }

      if (button.id === "job-detail") {
        endpoint = `/api/admin/operations/jobs/${trimmedJobId}`;
        data = await getAdminOperationJobDetail(trimmedJobId);
      }

      if (button.id === "job-error") {
        endpoint = `/api/admin/operations/jobs/${trimmedJobId}/error`;
        data = await getAdminOperationJobError(trimmedJobId);
      }

      if (button.id === "network-dict") {
        method = "POST";
        endpoint = "/api/admin/k8s/jobs/network-dict";
        data = await executeAdminNetworkDictJob();
      }

      appendLog(
        createLogEntry({
          title: button.label,
          endpoint,
          method,
          startedAt,
          status: "SUCCESS",
          data,
          error: null,
        }),
      );
    } catch (error) {
      appendLog(
        createLogEntry({
          title: button.label,
          endpoint,
          method,
          startedAt,
          status: "ERROR",
          data: null,
          error: getErrorMessage(error, "요청 로그를 불러오지 못했습니다."),
        }),
      );
    } finally {
      setActiveRequestId("");
    }
  };

  return (
    <section className="admin-page admin-internal-monitoring-page">
      <PageHeader
        title="시스템 내부 모니터링"
        description="시스템 내부 요청별 응답과 실패 원인을 로그 형태로 확인합니다."
      />

      <div className="admin-internal-monitoring-layout">
        <section className="admin-panel admin-internal-monitoring-controls">
          <aside className="admin-request-help">
            <span>요청 설명</span>
            <strong>{focusedButton.label}</strong>
            <p>{focusedButton.description}</p>
          </aside>

          <button
            type="button"
            className="admin-button admin-button--ghost admin-log-clear-button"
            onClick={() => setLogs([])}
            disabled={logs.length === 0 || Boolean(activeRequestId)}
          >
            로그 비우기
          </button>

          <div className="admin-request-section">
            <span className="admin-request-section-label">작업 현황 조회</span>
            <div className="admin-internal-monitoring-actions">
              {requestButtons
                .filter((button) => button.id === "summary" || button.id === "recent-jobs")
                .map(renderRequestButton)}
            </div>
          </div>

          <div className="admin-request-section">
            <span className="admin-request-section-label">outbox 기반 조회</span>
            <div className="admin-internal-monitoring-job-field">
              <label className="admin-field-label" htmlFor="internal-monitoring-job-id">
                outbox ID
              </label>
              <input
                id="internal-monitoring-job-id"
                className="admin-input"
                type="text"
                inputMode="numeric"
                placeholder="outbox ID 입력"
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
              />
            </div>
            <div className="admin-internal-monitoring-actions">
              {requestButtons
                .filter((button) => button.id === "job-detail" || button.id === "job-error")
                .map(renderRequestButton)}
            </div>
          </div>

          <div className="admin-request-section">
            <span className="admin-request-section-label">진단 Job</span>
            <div className="admin-internal-monitoring-actions">
              {requestButtons
                .filter((button) => button.id === "network-dict" || button.id === "network-test-stream")
                .map(renderRequestButton)}
            </div>
          </div>
        </section>

        <section className="admin-panel admin-log-panel">
          <div className="admin-panel-head">
            <div>
              <h2>로그 출력창</h2>
              <p className="admin-panel-subtitle">
                최신 요청이 가장 위에 표시됩니다. 실제 장애 확인 시 이 내용을 백엔드 로그와 함께 대조하면 됩니다.
              </p>
            </div>
            <span className="admin-panel-note">{logs.length}개 요청 기록</span>
          </div>

          {logs.length === 0 ? (
            <AdminStateNotice
              title="아직 출력된 로그가 없습니다"
              description="왼쪽의 요청 버튼을 클릭하면 API 응답 또는 에러가 이 영역에 크게 표시됩니다."
              tone="empty"
              compact
            />
          ) : (
            <div className="admin-log-output">
              {logs.map((log, index) => (
                <article key={`${log.id}-${index}`} className="admin-log-entry">
                  <div className="admin-log-entry-head">
                    <div>
                      <p className="admin-log-entry-kicker">#{logs.length - index}</p>
                      <h3>{log.title}</h3>
                    </div>
                    <span className={`admin-log-status admin-log-status--${log.status.toLowerCase()}`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="admin-log-meta">
                    <span>{log.method}</span>
                    <span>{log.endpoint}</span>
                    <span>요청 {log.requestedAt}</span>
                    <span>응답 {log.receivedAt}</span>
                  </div>

                  <pre>{log.output}</pre>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
