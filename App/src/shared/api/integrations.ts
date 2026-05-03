import { ApiError, api } from "./http";

type IntegrationApiResponse = {
  provider: string;
  connected_email: string;
  sync_status: string;
  is_gmail_connected: boolean;
  is_calendar_connected: boolean;
  last_synced_at: string | null;
};

type AuthorizationUrlApiResponse = {
  authorization_url: string;
};

function getFrontendOriginParams() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    frontend_origin: window.location.origin,
  };
}

export type IntegrationSnapshot = {
  provider: string;
  connectedEmail: string;
  syncStatus: string;
  isGmailConnected: boolean;
  isCalendarConnected: boolean;
  lastSyncedAt: string | null;
};

export async function getMyIntegration() {
  const response = await api.get<IntegrationApiResponse>("/api/integrations/me");

  return {
    provider: response.data.provider,
    connectedEmail: response.data.connected_email,
    syncStatus: response.data.sync_status,
    isGmailConnected: response.data.is_gmail_connected,
    isCalendarConnected: response.data.is_calendar_connected,
    lastSyncedAt: response.data.last_synced_at,
  } satisfies IntegrationSnapshot;
}

export async function getMyIntegrationSafe() {
  try {
    return await getMyIntegration();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
      return null;
    }

    throw error;
  }
}

export async function getGoogleAuthorizationUrl() {
  const response = await api.get<AuthorizationUrlApiResponse>(
    "/api/integrations/google/authorization-url",
    {
      params: getFrontendOriginParams(),
    },
  );
  return response.data.authorization_url;
}

export async function deleteMyIntegration() {
  await api.delete("/api/integrations/me");
}
