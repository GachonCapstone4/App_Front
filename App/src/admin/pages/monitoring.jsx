import { Activity } from "lucide-react";
import { AiUsageBadge } from "../../shared/ui/primitives/AiUsageBadge";
import { PageHeader } from "../shared/ui/PageHeader";

const GRAFANA_DASHBOARD_URL =
  "https://grafana.studylink.click/d/rabbitmq-capstone-v7/4430469?orgId=1&from=now-1h&to=now&timezone=Asia%2FSeoul&refresh=30s&kiosk";

export function MonitoringPage() {
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
            Live
          </span>
        </div>

        <iframe
          className="admin-grafana-frame"
          src={GRAFANA_DASHBOARD_URL}
          title="RabbitMQ Grafana Dashboard"
          width="100%"
          height="800"
          frameBorder="0"
        />
      </section>
    </section>
  );
}
