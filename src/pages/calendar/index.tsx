import { useSearchParams } from "react-router";
import { Calendar } from "../../app/components/Calendar";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

export function CalendarPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = resolveDemoScenarioId(searchParams.get("scenario"), "calendar-demo");

  return <Calendar scenarioId={scenarioId} />;
}
