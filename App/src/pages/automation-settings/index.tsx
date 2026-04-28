import { useSearchParams } from "react-router";
import { AutomationSettings } from "../../app/components/AutomationSettings";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

export function AutomationSettingsPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = resolveDemoScenarioId(
    searchParams.get("scenario"),
    "automation-demo",
  );

  return <AutomationSettings scenarioId={scenarioId} />;
}
