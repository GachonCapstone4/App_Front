import { useEffect, useMemo, useState } from "react";
import { Activity, ExternalLink, RefreshCw } from "lucide-react";
import { getAdminMonitoringDashboards } from "../../shared/api/admin";
import { getErrorMessage } from "../../shared/api/http";
import { isDemoModeEnabled } from "../../shared/scenarios/demo-mode";
import { AiUsageBadge } from "../../shared/ui/primitives/AiUsageBadge";
import { PageHeader } from "../shared/ui/PageHeader";
import { AdminStateNotice } from "../shared/ui/AdminStateNotice";

export function MonitoringPage() {
  const [dashboards, setDashboards] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedDashboard = useMemo(
    () => dashboards.find((dashboard) => dashboard.key === selectedKey) ?? dashboards[0] ?? null,
    [dashboards, selectedKey],
  );

  const loadDashboards = async () => {
    if (isDemoModeEnabled()) {
      setDashboards([]);
      setSelectedKey("");
      setErrorMessage("데모 모드에서는 운영 Grafana 대시보드를 불러오지 않습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const data = await getAdminMonitoringDashboards();
      setDashboards(data);
      setSelectedKey((currentKey) =>
        data.some((dashboard) => dashboard.key === currentKey) ? currentKey : data[0]?.key ?? "",
      );
    } catch (error) {
      setDashboards([]);
      setSelectedKey("");
      setErrorMessage(getErrorMessage(error, "Grafana 대시보드 설정을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboards();
  }, []);

  return (
    <section className="admin-page">
      <PageHeader
        title="시스템 운영 모니터링"
        description="RabbitMQ와 클러스터 운영 지표를 Grafana 대시보드로 확인합니다."
      />

      <section className="admin-panel admin-grafana-panel">
        <div className="admin-panel-head">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2>운영 대시보드</h2>
              <AiUsageBadge label="Grafana" />
            </div>
            <p className="admin-panel-subtitle">
              최근 1시간 기준으로 30초마다 새로고침됩니다.
            </p>
          </div>
          <span className="admin-panel-note">
            <Activity size={14} />
            {loading ? "Loading" : "Live"}
          </span>
        </div>

        {dashboards.length > 1 ? (
          <div className="admin-toolbar" style={{ marginBottom: 16 }}>
            <div className="admin-toolbar-group">
              {dashboards.map((dashboard) => (
                <button
                  key={dashboard.key}
                  type="button"
                  className={dashboard.key === selectedDashboard?.key ? "admin-chip admin-chip--active" : "admin-chip"}
                  onClick={() => setSelectedKey(dashboard.key)}
                >
                  {dashboard.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <AdminStateNotice
            title="Grafana 설정을 불러오는 중입니다"
            description="Admin Server에서 운영 대시보드 URL 목록을 가져오고 있습니다."
            compact
          />
        ) : errorMessage ? (
          <AdminStateNotice
            title="대시보드를 표시하지 못했습니다"
            description={errorMessage}
            tone="error"
            compact
          />
        ) : selectedDashboard ? (
          <>
            <div className="admin-button-row admin-button-row--spaced" style={{ marginBottom: 12 }}>
              <span className="admin-panel-subtitle">{selectedDashboard.label} 대시보드</span>
              <div className="admin-button-row">
                <button
                  type="button"
                  className="admin-button admin-button--ghost admin-button--sm"
                  onClick={() => void loadDashboards()}
                >
                  <RefreshCw size={14} />
                  설정 새로고침
                </button>
                <a
                  className="admin-button admin-button--ghost admin-button--sm"
                  href={selectedDashboard.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} />
                  Grafana에서 열기
                </a>
              </div>
            </div>
            <iframe
              key={selectedDashboard.key}
              className="admin-grafana-frame"
              src={selectedDashboard.url}
              title={`${selectedDashboard.label} Grafana Dashboard`}
              width="100%"
              height="800"
              frameBorder="0"
            />
          </>
        ) : (
          <AdminStateNotice
            title="등록된 Grafana 대시보드가 없습니다"
            description="admin-configmap.yaml의 ADMIN_MONITORING_GRAFANA_DASHBOARDS 값을 확인해 주세요."
            tone="empty"
            compact
          />
        )}
      </section>
    </section>
  );
}
