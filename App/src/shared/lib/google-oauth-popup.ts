const GOOGLE_OAUTH_POPUP_NAME = "maily-google-oauth";
export const GOOGLE_OAUTH_STORAGE_KEY = "maily-google-oauth-result";
export const GOOGLE_OAUTH_POPUP_MARKER_KEY = "maily-google-oauth-popup";
export const GOOGLE_OAUTH_RETURN_PATH_KEY = "maily-google-oauth-return-path";
export const GOOGLE_OAUTH_DESKTOP_ORIGIN = "maily://app";
const GOOGLE_OAUTH_POPUP_WIDTH = 640;
const GOOGLE_OAUTH_POPUP_HEIGHT = 820;

export type GoogleOAuthPopupMessage = {
  type: "maily-google-oauth";
  result: string;
  message?: string;
  gmailConnected?: string;
  calendarConnected?: string;
  tempToken?: string;
  email?: string;
  name?: string;
  token?: string;
};

export function parseStoredGoogleOAuthResult(value: string | null): GoogleOAuthPopupMessage | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<GoogleOAuthPopupMessage>;

    if (parsed.type !== "maily-google-oauth" || typeof parsed.result !== "string") {
      return null;
    }

    return {
      type: "maily-google-oauth",
      result: parsed.result,
      message: typeof parsed.message === "string" ? parsed.message : "",
      gmailConnected:
        typeof parsed.gmailConnected === "string" ? parsed.gmailConnected : "false",
      calendarConnected:
        typeof parsed.calendarConnected === "string" ? parsed.calendarConnected : "false",
      tempToken: typeof parsed.tempToken === "string" ? parsed.tempToken : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      name: typeof parsed.name === "string" ? parsed.name : "",
      token: typeof parsed.token === "string" ? parsed.token : "",
    };
  } catch {
    return null;
  }
}

export function consumeStoredGoogleOAuthResult() {
  const payload = parseStoredGoogleOAuthResult(
    window.localStorage.getItem(GOOGLE_OAUTH_STORAGE_KEY),
  );

  if (payload) {
    window.localStorage.removeItem(GOOGLE_OAUTH_STORAGE_KEY);
  }

  return payload;
}

function isAllowedGoogleOAuthReturnPath(value: string) {
  return (
    value === "/onboarding" ||
    value === "/app/automation" ||
    value === "/app/settings?tab=email"
  );
}

export function storeGoogleOAuthReturnPath(path: string) {
  if (!isAllowedGoogleOAuthReturnPath(path)) {
    return;
  }

  window.localStorage.setItem(GOOGLE_OAUTH_RETURN_PATH_KEY, path);
}

export function consumeGoogleOAuthReturnPath() {
  const returnPath = window.localStorage.getItem(GOOGLE_OAUTH_RETURN_PATH_KEY);
  window.localStorage.removeItem(GOOGLE_OAUTH_RETURN_PATH_KEY);

  if (!returnPath || !isAllowedGoogleOAuthReturnPath(returnPath)) {
    return null;
  }

  return returnPath;
}

export function isDesktopGoogleOAuthFlow() {
  return typeof window !== "undefined" && window.location.protocol === "maily:";
}

export function getGoogleOAuthFrontendOrigin() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return isDesktopGoogleOAuthFlow() ? GOOGLE_OAUTH_DESKTOP_ORIGIN : window.location.origin;
}

function buildGoogleOAuthPopupFeatures() {
  const screenLeft =
    typeof window.screenLeft === "number" ? window.screenLeft : window.screenX;
  const screenTop =
    typeof window.screenTop === "number" ? window.screenTop : window.screenY;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = Math.max(0, screenLeft + Math.round((viewportWidth - GOOGLE_OAUTH_POPUP_WIDTH) / 2));
  const top = Math.max(0, screenTop + Math.round((viewportHeight - GOOGLE_OAUTH_POPUP_HEIGHT) / 2));

  return [
    "popup=yes",
    `width=${GOOGLE_OAUTH_POPUP_WIDTH}`,
    `height=${GOOGLE_OAUTH_POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}

export function openGoogleOAuthPopup() {
  const popup = window.open(
    "",
    `${GOOGLE_OAUTH_POPUP_NAME}-${Date.now()}`,
    buildGoogleOAuthPopupFeatures(),
  );

  try {
    popup?.sessionStorage.setItem(GOOGLE_OAUTH_POPUP_MARKER_KEY, "true");
  } catch {
    // 팝업이 이미 브라우저 정책에 의해 분리된 경우 callback의 다른 신호로 판단한다.
  }

  return popup;
}

export function navigateGoogleOAuthPopup(popup: Window, authorizationUrl: string) {
  popup.location.href = authorizationUrl;
  popup.focus();
}

export async function openGoogleOAuthInSystemBrowser(authorizationUrl: string) {
  if (!window.mailyShell) {
    window.location.href = authorizationUrl;
    return;
  }

  await window.mailyShell.openExternal(authorizationUrl);
}

export function isGoogleOAuthPopupWindow() {
  try {
    if (window.sessionStorage.getItem(GOOGLE_OAUTH_POPUP_MARKER_KEY) === "true") {
      return true;
    }
  } catch {
    // sessionStorage 접근이 막힌 경우 window.name만 확인한다.
  }

  return window.name.startsWith(GOOGLE_OAUTH_POPUP_NAME);
}

export function closeGoogleOAuthPopup(popup: Window | null) {
  if (!popup) {
    return;
  }

  try {
    popup.close();
  } catch {
    // Google COOP 정책으로 분리된 창은 접근이 막힐 수 있다. 콜백 페이지의 자체 close에 맡긴다.
  }
}
