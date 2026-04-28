import { useSearchParams } from "react-router";
import { BusinessProfile } from "../../app/components/BusinessProfile";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

export function BusinessProfilePage() {
  const [searchParams] = useSearchParams();
  const scenarioId = resolveDemoScenarioId(searchParams.get("scenario"), "profile-demo");

  return <BusinessProfile scenarioId={scenarioId} />;
}
