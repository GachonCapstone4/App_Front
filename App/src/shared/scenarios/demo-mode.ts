export function isDemoModeEnabled() {
  return import.meta.env.VITE_DEMO_MODE === "false";
}

export function resolveDemoScenarioId(
  scenarioId: string | null,
  defaultScenarioId: string,
) {
  if (scenarioId) {
    return scenarioId;
  }

  return isDemoModeEnabled() ? defaultScenarioId : null;
}
