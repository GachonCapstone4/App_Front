import scenarioManifest from "./user-scenarios.json";

export type ScenarioStateType =
  | "validation"
  | "empty"
  | "load-error"
  | "action-error"
  | "permission"
  | "disconnected"
  | "unexpected"
  | "not-found";

export interface AppScenarioDefinition {
  scenarioId: string;
  route: string;
  screenTitle: string;
  stateType: ScenarioStateType;
  outputFile: string;
  viewport: {
    width: number;
    height: number;
  };
  description: string;
}

export const USER_CAPTURE_VIEWPORT = {
  width: 1440,
  height: 1024,
} as const;

export const userScenarioManifest =
  scenarioManifest as AppScenarioDefinition[];

export function getUserScenarioDefinition(scenarioId: string | null | undefined) {
  if (!scenarioId) {
    return null;
  }

  return userScenarioManifest.find(
    (scenario) => scenario.scenarioId === scenarioId,
  ) ?? null;
}

export function isUserScenario(
  scenarioId: string | null | undefined,
  expectedScenarioId: string,
) {
  return scenarioId === expectedScenarioId;
}

export function hasUserScenario(
  scenarioId: string | null | undefined,
  allowedScenarios: string[],
) {
  return Boolean(scenarioId && allowedScenarios.includes(scenarioId));
}
