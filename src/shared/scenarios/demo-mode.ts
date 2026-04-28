export function isDemoModeEnabled() {
  return import.meta.env.VITE_DEMO_MODE === "true";
}

export function resolveDemoScenarioId(
  scenarioId: string | null,
  defaultScenarioId: string,
) {
  if (scenarioId) {
    return scenarioId;
  }

  if (isDemoModeEnabled()) {
    return defaultScenarioId;
  }

  return null;
}
