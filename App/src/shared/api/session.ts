import {
  clearAppSession,
  createAuthenticatedSession,
  getAccessToken,
  setAccessToken,
} from "../lib/app-session";
import { getMyProfile, loginWithPassword, signupUser } from "./auth";
import { getBusinessProfile } from "./business";
import { getMyIntegrationSafe } from "./integrations";
import { getOnboardingStatusSafe } from "./onboarding";

type SessionBootstrapOptions = {
  onboardingCompleted?: boolean;
};

async function buildSessionFromServerState(options?: SessionBootstrapOptions) {
  const [profile, integration, businessProfile, onboardingStatus] = await Promise.all([
    getMyProfile(),
    getMyIntegrationSafe(),
    getBusinessProfile(),
    getOnboardingStatusSafe(),
  ]);

  const onboardingCompleted =
    options?.onboardingCompleted ??
    (profile.role === "ADMIN"
      ? true
      : onboardingStatus ?? Boolean(integration?.connectedEmail || businessProfile));

  return createAuthenticatedSession({
    name: profile.name,
    email: profile.email,
    role: profile.role,
    onboardingCompleted,
    connectedEmail: integration?.connectedEmail ?? "",
    connectedEmails: integration?.connectedEmail ? [integration.connectedEmail] : [],
  });
}

export async function loginAndCreateSession(email: string, password: string) {
  const tokenResponse = await loginWithPassword(email, password);
  setAccessToken(tokenResponse.accessToken);

  try {
    return await buildSessionFromServerState();
  } catch (error) {
    clearAppSession();
    throw error;
  }
}

export async function signupAndCreateSession(name: string, email: string, password: string) {
  await signupUser(name, email, password);
  const tokenResponse = await loginWithPassword(email, password);
  setAccessToken(tokenResponse.accessToken);

  try {
    return await buildSessionFromServerState({ onboardingCompleted: false });
  } catch (error) {
    clearAppSession();
    throw error;
  }
}

export async function refreshStoredSession() {
  if (!getAccessToken()) {
    clearAppSession();
    return null;
  }

  try {
    return await buildSessionFromServerState();
  } catch (error) {
    clearAppSession();
    return null;
  }
}
