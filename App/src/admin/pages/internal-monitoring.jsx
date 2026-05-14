import { useEffect, useState } from "react";
import { Activity, FileSearch, ListChecks, Play, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  executeAdminNetworkDictJob,
  executeAdminNodeJob,
  executeAdminOSDictJob,
  executeAdminDatasetJob,
  executeAdminModelDeploy,
  executeAdminRabbitMQJob,
  executeAdminSagemakerTrainingJob,
  executeAdminVPNDictJob,
  getAdminDlqCount,
  getAdminOperationJobDetail,
  getAdminOperationJobError,
  getAdminOperationJobSummary,
  getAdminOperationJobs,
  purgeAdminDlq,
} from "../../shared/api/admin";
import { getErrorMessage } from "../../shared/api/http";
import { subscribeAppEvent } from "../../shared/lib/app-event-stream";
import { AiUsageBadge } from "../../shared/ui/primitives/AiUsageBadge";
import { PageHeader } from "../shared/ui/PageHeader";
import { AdminStateNotice } from "../shared/ui/AdminStateNotice";

const LOG_SEPARATOR = "---------------";
const JOB_REQUEST_ACK_MESSAGES = {
  "network-dict": "클러스터 네트워크 진단 실행 요청을 보냈습니다. 실시간 진단 로그를 기다리는 중입니다.",
  "os-dict": "OS 진단 실행 요청을 보냈습니다. 실시간 진단 로그를 기다리는 중입니다.",
  "vpn-dict": "VPN 진단 실행 요청을 보냈습니다. 실시간 진단 로그를 기다리는 중입니다.",
  "node-job": "Kubernetes 노드 점검 요청을 보냈습니다. 실시간 k8s 로그를 기다리는 중입니다.",
  "rabbitmq-job": "RabbitMQ 점검 요청을 보냈습니다. 실시간 rabbitmq 로그를 기다리는 중입니다.",
  "dataset-job": "데이터셋 Job 실행 요청을 보냈습니다. 실시간 데이터 수집 로그를 기다리는 중입니다.",
  "sagemaker-training": "SageMaker 학습 실행 요청을 보냈습니다. 실시간 학습 로그를 기다리는 중입니다.",
  "model-deploy": "모델 교체 요청을 보냈습니다. 배포 진행 로그를 기다리는 중입니다.",
};

const DLQ_CONTROL_BUTTON = {
  id: "dlq-control",
  label: "DLQ 관리",
  description: "RabbitMQ 실패 큐 메시지 수를 확인하고 전체 삭제합니다.",
  icon: Trash2,
  dangerous: true,
};

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
    label: "클러스터 네트워크 진단 실행",
    description: "각 서버 노드의 게이트웨이 및 외부 인터넷 연결 상태를 점검합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "os-dict",
    label: "OS 진단 실행",
    description: "각 서버 노드의 OS 환경 진단 작업을 실행합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "vpn-dict",
    label: "VPN 진단 실행",
    description: "각 서버 노드의 VPN 접속 환경 진단 작업을 실행합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "node-job",
    label: "Kubernetes 노드 점검",
    description: "Kubernetes 노드 상태 점검 Job을 실행합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "rabbitmq-job",
    label: "RabbitMQ 점검",
    description: "RabbitMQ 상태 점검 Job을 실행합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "dataset-job",
    label: "데이터셋 Job 실행",
    description: "Kubernetes 데이터셋 생성 Job을 실행합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "sagemaker-training",
    label: "SageMaker 학습 실행",
    description: "SageMaker 학습 Job 생성을 요청합니다.",
    icon: Play,
    dangerous: true,
  },
  {
    id: "model-deploy",
    label: "모델 교체",
    description: "학습 완료 모델을 활성 모델로 교체하는 배포 요청을 전송합니다.",
    icon: Play,
    dangerous: true,
  },
];

function formatLogOutput(data, error) {
  if (error) {
    return error;
  }

  if (data == null) {
    return "응답 데이터 없음";
  }

  if (typeof data === "string") {
    return data;
  }

  return JSON.stringify(data, null, 2);
}

function createLogEntry({ title, endpoint, method, startedAt, status, data, error }) {
  return {
    id: `${startedAt}-${title}-${status}`,
    title,
    endpoint,
    method,
    status,
    requestedAt: startedAt,
    receivedAt: new Date().toISOString(),
    output: formatLogOutput(data, error),
  };
}

function getRequestSuccessOutput(buttonId, data) {
  if (
    data &&
    typeof data === "object" &&
    data.success === false
  ) {
    return data;
  }

  return JOB_REQUEST_ACK_MESSAGES[buttonId] ?? data;
}

function parseDiagnosticEventPayload(payload) {
  if (typeof payload === "string") {
    return {
      message: payload,
      metadata: {},
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      message: "",
      metadata: {},
    };
  }

  const nestedData = payload.data;

  if (typeof nestedData === "string") {
    return {
      message: nestedData,
      metadata: payload,
    };
  }

  if (nestedData && typeof nestedData === "object") {
    return {
      message: [nestedData.message, nestedData.raw_output].filter(Boolean).join("\n"),
      metadata: {
        ...payload,
        ...nestedData,
      },
    };
  }

  return {
    message: [payload.message, payload.raw_output].filter(Boolean).join("\n"),
    metadata: payload,
  };
}

function createDiagnosticLogEntry(eventName, payload) {
  const receivedAt = new Date().toISOString();
  const { message: rawMessage, metadata: normalizedMetadata } = parseDiagnosticEventPayload(payload);
  const eventTime = normalizedMetadata.timestamp ?? receivedAt;
  const eventType = normalizedMetadata.sse_type ?? eventName;
  const message = rawMessage.trim() || `${eventType} 메시지 본문이 비어 있습니다.`;
  const metadata = {
    sse_type: eventType,
    module: normalizedMetadata.module,
    node_ip: normalizedMetadata.node_ip,
    stage: normalizedMetadata.stage,
    status: normalizedMetadata.status,
    timestamp: normalizedMetadata.timestamp,
    user_id: normalizedMetadata.user_id,
  };

  return {
    id: `${eventTime}-${eventType}-${metadata.node_ip ?? "unknown"}-${metadata.stage ?? "event"}`,
    title: `${eventType} ${metadata.node_ip ?? "unknown"} ${metadata.stage ?? "event"}`,
    endpoint: `event: ${eventType}`,
    method: "SSE",
    status: metadata.status === "error" || metadata.status === "failed" ? "ERROR" : "SUCCESS",
    requestedAt: eventTime,
    receivedAt,
    output: message,
  };
}

export function InternalMonitoringPage() {
  const [jobId, setJobId] = useState("");
  const [activeRequestId, setActiveRequestId] = useState("");
  const [focusedButtonId, setFocusedButtonId] = useState("summary");
  const [logs, setLogs] = useState([]);
  const [activeOutputPanel, setActiveOutputPanel] = useState("logs");
  const [dlqCount, setDlqCount] = useState(null);
  const [dlqLoading, setDlqLoading] = useState(false);
  const [dlqPurging, setDlqPurging] = useState(false);
  const [dlqError, setDlqError] = useState("");
  const [dlqMessage, setDlqMessage] = useState("");
  const focusedButton =
    [...requestButtons, DLQ_CONTROL_BUTTON].find((button) => button.id === focusedButtonId) ?? requestButtons[0];
  const logStream = logs
    .map((log) => `${LOG_SEPARATOR}\n${log.output}`)
    .join("\n");

  const appendLog = (entry) => {
    setLogs((current) => [entry, ...current].slice(0, 20));
  };

  const loadDlqCount = async () => {
    setDlqLoading(true);
    setDlqError("");

    try {
      const data = await getAdminDlqCount();
      setDlqCount(data.count);
    } catch (error) {
      setDlqError(getErrorMessage(error, "DLQ 메시지 수를 불러오지 못했습니다."));
    } finally {
      setDlqLoading(false);
    }
  };

  const openDlqPanel = () => {
    setFocusedButtonId(DLQ_CONTROL_BUTTON.id);
    setActiveOutputPanel("dlq");
    setDlqMessage("");
    void loadDlqCount();
  };

  const handlePurgeDlq = async () => {
    const confirmed = window.confirm("DLQ 메시지를 모두 삭제할까요?");

    if (!confirmed) {
      return;
    }

    setDlqPurging(true);
    setDlqError("");
    setDlqMessage("");

    try {
      const data = await purgeAdminDlq();
      setDlqMessage(`${data.message} (${data.purged_at})`);
      setDlqCount(0);
      appendLog(
        createLogEntry({
          title: "DLQ 전체 삭제",
          endpoint: "/api/admin/rabbitmq/dlq/purge",
          method: "DELETE",
          startedAt: new Date().toISOString(),
          status: "SUCCESS",
          data,
          error: null,
        }),
      );
    } catch (error) {
      const message = getErrorMessage(error, "DLQ 전체 삭제 요청을 처리하지 못했습니다.");
      setDlqError(message);
      appendLog(
        createLogEntry({
          title: "DLQ 전체 삭제",
          endpoint: "/api/admin/rabbitmq/dlq/purge",
          method: "DELETE",
          startedAt: new Date().toISOString(),
          status: "ERROR",
          data: null,
          error: message,
        }),
      );
    } finally {
      setDlqPurging(false);
    }
  };

  const renderRequestButton = (button) => (
    <button
      key={button.id}
      type="button"
      className={button.dangerous ? "admin-request-card admin-request-card--accent" : "admin-request-card"}
      onClick={() => void runRequest(button)}
      onFocus={() => setFocusedButtonId(button.id)}
      onMouseEnter={() => setFocusedButtonId(button.id)}
      disabled={Boolean(activeRequestId)}
      title={button.description}
    >
      <button.icon size={18} />
      <span>
        <strong>{button.label}</strong>
      </span>
    </button>
  );

  const renderDlqPanel = () => (
    <div className="admin-dlq-panel">
      <div className="admin-dlq-summary">
        <span>현재 DLQ 메시지</span>
        <strong>{dlqCount == null ? "-" : `${dlqCount}건`}</strong>
      </div>

      {dlqError ? (
        <AdminStateNotice
          title="DLQ 요청을 처리하지 못했습니다"
          description={dlqError}
          tone="error"
          compact
        />
      ) : null}

      {dlqMessage ? (
        <div className="admin-dlq-message">
          <strong>DLQ 삭제가 완료되었습니다</strong>
          <span>{dlqMessage}</span>
        </div>
      ) : null}

      <div className="admin-button-row admin-button-row--spaced">
        <button
          type="button"
          className="admin-button admin-button--ghost"
          onClick={() => void loadDlqCount()}
          disabled={dlqLoading || dlqPurging}
        >
          <RefreshCw size={14} />
          {dlqLoading ? "조회 중..." : "메시지 수 새로고침"}
        </button>
        <button
          type="button"
          className="admin-button"
          onClick={() => void handlePurgeDlq()}
          disabled={dlqLoading || dlqPurging || dlqCount === 0}
        >
          <Trash2 size={14} />
          {dlqPurging ? "삭제 중..." : "DLQ 전체 삭제"}
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    const subscribeDiagnosticEvent = (eventName) => subscribeAppEvent(eventName, (payload) => {
      setLogs((current) => [
        createDiagnosticLogEntry(eventName, payload),
        ...current,
      ].slice(0, 20));
    });

    const unsubscribeNetwork = subscribeDiagnosticEvent("network_test");
    const unsubscribeOS = subscribeDiagnosticEvent("os");
    const unsubscribeVPN = subscribeDiagnosticEvent("vpn");
    const unsubscribeDataset = subscribeDiagnosticEvent("ai-collecting-updated");
    const unsubscribeTraining = subscribeDiagnosticEvent("ai-training-updated");
    const unsubscribeK8s = subscribeDiagnosticEvent("k8s");
    const unsubscribeRabbitMQ = subscribeDiagnosticEvent("rabbitmq");

    return () => {
      unsubscribeNetwork();
      unsubscribeOS();
      unsubscribeVPN();
      unsubscribeDataset();
      unsubscribeTraining();
      unsubscribeK8s();
      unsubscribeRabbitMQ();
    };
  }, []);

  const runRequest = async (button) => {
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

      setActiveOutputPanel("logs");

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

      if (button.id === "os-dict") {
        method = "POST";
        endpoint = "/api/admin/k8s/jobs/os-dict";
        data = await executeAdminOSDictJob();
      }

      if (button.id === "vpn-dict") {
        method = "POST";
        endpoint = "/api/admin/k8s/jobs/vpn-dict";
        data = await executeAdminVPNDictJob();
      }

      if (button.id === "node-job") {
        method = "POST";
        endpoint = "/api/admin/k8s/jobs/node";
        data = await executeAdminNodeJob();
      }

      if (button.id === "rabbitmq-job") {
        method = "POST";
        endpoint = "/api/admin/k8s/jobs/rabbitmq";
        data = await executeAdminRabbitMQJob();
      }

      if (button.id === "dataset-job") {
        method = "POST";
        endpoint = "/api/admin/k8s/jobs/dataset";
        data = await executeAdminDatasetJob();
      }

      if (button.id === "sagemaker-training") {
        method = "POST";
        endpoint = "/api/admin/sagemakertraining";
        data = await executeAdminSagemakerTrainingJob();
      }

      if (button.id === "model-deploy") {
        method = "POST";
        endpoint = "/api/admin/modeldeploy";
        data = await executeAdminModelDeploy();
      }

      appendLog(
        createLogEntry({
          title: button.label,
          endpoint,
          method,
          startedAt,
          status: "SUCCESS",
          data: getRequestSuccessOutput(button.id, data),
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
        description="AI/RAG 작업 상태, 메일 처리 요청, SSE 진단 이벤트의 응답과 실패 원인을 로그 형태로 확인합니다."
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
              <input
                id="internal-monitoring-job-id"
                className="admin-input"
                type="text"
                inputMode="numeric"
                placeholder="OUTBOX ID 입력"
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
            <span className="admin-request-section-label">시스템 진단 Job 실행</span>
            <div className="admin-internal-monitoring-actions">
              {requestButtons
                .filter((button) =>
                  button.id === "network-dict" ||
                  button.id === "os-dict" ||
                  button.id === "vpn-dict" ||
                  button.id === "node-job" ||
                  button.id === "rabbitmq-job"
                )
                .map(renderRequestButton)}
            </div>
          </div>

          <div className="admin-request-section">
            <span className="admin-request-section-label">분류 모델 재학습</span>
            <div className="admin-internal-monitoring-actions">
              {requestButtons
                .filter((button) =>
                  button.id === "dataset-job" ||
                  button.id === "sagemaker-training" ||
                  button.id === "model-deploy"
                )
                .map(renderRequestButton)}
            </div>
          </div>

          <div className="admin-request-section">
            <span className="admin-request-section-label">실패 큐 관리</span>
            <div className="admin-internal-monitoring-actions">
              <button
                type="button"
                className="admin-request-card admin-request-card--accent"
                onClick={openDlqPanel}
                onFocus={() => setFocusedButtonId(DLQ_CONTROL_BUTTON.id)}
                onMouseEnter={() => setFocusedButtonId(DLQ_CONTROL_BUTTON.id)}
                disabled={Boolean(activeRequestId)}
                title={DLQ_CONTROL_BUTTON.description}
              >
                <DLQ_CONTROL_BUTTON.icon size={18} />
                <span>
                  <strong>{DLQ_CONTROL_BUTTON.label}</strong>
                </span>
              </button>
            </div>
          </div>
        </section>

        <section className="admin-panel admin-log-panel">
          <div className="admin-panel-head">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2>로그 출력창</h2>
                <AiUsageBadge label="AI/RAG 이벤트 확인" />
              </div>
              <p className="admin-panel-subtitle">
                최신 요청과 실시간 진단 이벤트가 가장 위에 표시됩니다. AI/RAG 장애 확인 시 이 내용을 백엔드 로그와 함께 대조하면 됩니다.
              </p>
            </div>
            <span className="admin-panel-note">
              {activeOutputPanel === "dlq" ? "DLQ 관리" : `${logs.length}개 로그`}
            </span>
          </div>

          {activeOutputPanel === "dlq" ? (
            renderDlqPanel()
          ) : logs.length === 0 ? (
            <AdminStateNotice
              title="아직 출력된 로그가 없습니다"
              description="왼쪽의 요청 버튼을 클릭하면 응답 또는 이벤트 로그가 이 영역에 표시됩니다."
              tone="empty"
              compact
            />
          ) : (
            <div className="admin-log-output">
              <pre className="admin-log-stream">{logStream}</pre>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
