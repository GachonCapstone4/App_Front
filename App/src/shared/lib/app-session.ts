export type UserRole = "USER" | "ADMIN";

export type AppSession = {
  authenticated: boolean;
  onboardingCompleted: boolean;
  role: UserRole;
  userName: string;
  userEmail: string;
  connectedEmail: string;
  connectedEmails: string[];
};

export const ADMIN_VPN_CIDR = "192.168.0.0/24";

const SESSION_STORAGE_KEY = "emailassist-app-session";
const ACCESS_TOKEN_STORAGE_KEY = "emailassist-access-token";

const defaultSession: AppSession = {
  authenticated: false,
  onboardingCompleted: false,
  role: "USER",
  userName: "",
  userEmail: "",
  connectedEmail: "",
  connectedEmails: [],
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function notifySessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("emailassist-session-updated"));
}

function normalizeConnectedEmails(connectedEmail: string, connectedEmails: string[]) {
  const dedupedEmails = Array.from(
    new Set(
      connectedEmails.filter(
        (email): email is string => typeof email === "string" && email.trim().length > 0,
      ),
    ),
  );

  if (connectedEmail.trim().length > 0 && !dedupedEmails.includes(connectedEmail)) {
    dedupedEmails.push(connectedEmail);
  }

  return dedupedEmails;
}

function writeSession(session: AppSession) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  notifySessionChange();
}

export function getAppSession(): AppSession {
  if (!canUseStorage()) {
    return defaultSession;
  }

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return defaultSession;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSession>;
    const connectedEmails = normalizeConnectedEmails(
      parsed.connectedEmail ?? "",
      Array.isArray(parsed.connectedEmails) ? parsed.connectedEmails : [],
    );
    const connectedEmail = parsed.connectedEmail ?? connectedEmails[connectedEmails.length - 1] ?? "";

    return {
      ...defaultSession,
      ...parsed,
      authenticated: parsed.authenticated === true,
      onboardingCompleted: parsed.onboardingCompleted === true,
      role: parsed.role === "ADMIN" ? "ADMIN" : "USER",
      userName: parsed.userName ?? "",
      userEmail: parsed.userEmail ?? "",
      connectedEmail,
      connectedEmails,
    };
  } catch {
    return defaultSession;
  }
}

export function updateAppSession(partial: Partial<AppSession>) {
  const current = getAppSession();
  const nextConnectedEmail = partial.connectedEmail ?? current.connectedEmail;
  const nextConnectedEmails = normalizeConnectedEmails(
    nextConnectedEmail,
    partial.connectedEmails ?? current.connectedEmails,
  );
  const nextSession: AppSession = {
    ...current,
    ...partial,
    connectedEmail: nextConnectedEmail || nextConnectedEmails[nextConnectedEmails.length - 1] || "",
    connectedEmails: nextConnectedEmails,
  };

  writeSession(nextSession);
  return nextSession;
}

export function createAuthenticatedSession({
  name,
  email,
  role = "USER",
  onboardingCompleted = role === "ADMIN",
  connectedEmail = "",
  connectedEmails = [],
}: {
  name: string;
  email: string;
  role?: UserRole;
  onboardingCompleted?: boolean;
  connectedEmail?: string;
  connectedEmails?: string[];
}) {
  const normalizedEmails = normalizeConnectedEmails(connectedEmail, connectedEmails);
  const primaryConnectedEmail =
    connectedEmail || normalizedEmails[normalizedEmails.length - 1] || "";
  const session: AppSession = {
    authenticated: true,
    onboardingCompleted,
    role,
    userName: name.trim(),
    userEmail: email.trim(),
    connectedEmail: primaryConnectedEmail,
    connectedEmails: normalizedEmails,
  };

  writeSession(session);
  return session;
}

export function setAccessToken(accessToken: string) {
  if (!canUseStorage()) {
    return;
  }

  if (accessToken.trim().length === 0) {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  }
}

export function getAccessToken() {
  if (!canUseStorage()) {
    return "";
  }

  return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? "";
}

export function markOnboardingComplete() {
  return updateAppSession({ onboardingCompleted: true });
}

export function setConnectedEmail(connectedEmail: string) {
  return updateAppSession({
    connectedEmail,
    connectedEmails: connectedEmail ? [connectedEmail] : [],
  });
}

export function setConnectedEmails(connectedEmails: string[]) {
  const normalizedEmails = normalizeConnectedEmails("", connectedEmails);
  return updateAppSession({
    connectedEmail: normalizedEmails[normalizedEmails.length - 1] ?? "",
    connectedEmails: normalizedEmails,
  });
}

export function deriveGoogleIntegrationEmail(userEmail: string) {
  const normalizedEmail = userEmail.trim().toLowerCase();

  if (!normalizedEmail) {
    return "user@gmail.com";
  }

  if (normalizedEmail.endsWith("@gmail.com")) {
    return normalizedEmail;
  }

  const localPart = normalizedEmail.split("@")[0] ?? "user";
  return `${localPart || "user"}@gmail.com`;
}

export function isAdminSession(session: AppSession) {
  return session.authenticated && session.role === "ADMIN";
}

export function canAccessAdmin(session: AppSession) {
  return isAdminSession(session);
}

export function canAccessUserWorkspace(session: AppSession) {
  return session.authenticated && session.role === "USER";
}

export function clearAppSession() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  notifySessionChange();
}

export function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "user";

  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
