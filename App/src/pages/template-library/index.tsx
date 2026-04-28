import { useSearchParams } from "react-router";
import { TemplateLibrary } from "../../app/components/TemplateLibrary";
import { resolveDemoScenarioId } from "../../shared/scenarios/demo-mode";

export function TemplateLibraryPage() {
  const [searchParams] = useSearchParams();
  const scenarioId = resolveDemoScenarioId(searchParams.get("scenario"), "templates-demo");

  return <TemplateLibrary scenarioId={scenarioId} />;
}
