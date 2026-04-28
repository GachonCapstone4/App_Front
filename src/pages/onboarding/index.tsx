import { useSearchParams } from "react-router";
import { Onboarding } from "../../app/components/Onboarding";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

export function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = resolveDemoScenarioId(
    searchParams.get("scenario"),
    "onboarding-email-normal",
  );

  return <Onboarding scenarioId={scenarioId} />;
}
