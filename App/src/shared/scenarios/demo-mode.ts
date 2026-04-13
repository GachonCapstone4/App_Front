export function isDemoModeEnabled() {
  return false;
}

export function resolveDemoScenarioId(
  scenarioId: string | null,
  _defaultScenarioId: string,
) {
  return scenarioId;
}
