import { useSearchParams } from "react-router";
import { AuthPage } from "../../app/components/AuthPage";

export function AuthRoutePage() {
  const [searchParams] = useSearchParams();

  return <AuthPage scenarioId={searchParams.get("scenario")} />;
}
