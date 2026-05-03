const GOOGLE_OAUTH_POPUP_NAME = "emailassist-google-oauth";
export const GOOGLE_OAUTH_STORAGE_KEY = "emailassist-google-oauth-result";
const GOOGLE_OAUTH_POPUP_WIDTH = 640;
const GOOGLE_OAUTH_POPUP_HEIGHT = 820;

export type GoogleOAuthPopupMessage = {
  type: "emailassist-google-oauth";
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

    if (parsed.type !== "emailassist-google-oauth" || typeof parsed.result !== "string") {
      return null;
    }

    return {
      type: "emailassist-google-oauth",
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
  return window.open(
    "",
    `${GOOGLE_OAUTH_POPUP_NAME}-${Date.now()}`,
    buildGoogleOAuthPopupFeatures(),
  );
}

export function navigateGoogleOAuthPopup(popup: Window, authorizationUrl: string) {
  popup.location.href = authorizationUrl;
  popup.focus();
}

export function isGoogleOAuthPopupWindow() {
  return window.name.startsWith(GOOGLE_OAUTH_POPUP_NAME);
}

export function isGoogleOAuthPopupClosed(popup: Window | null) {
  if (!popup) {
    return true;
  }

  try {
    return popup.closed;
  } catch {
    return false;
  }
}

export function closeGoogleOAuthPopup(popup: Window | null) {
  if (!popup) {
    return;
  }

  try {
    if (!popup.closed) {
      popup.close();
    }
  } catch {
    // Google COOP 정책으로 분리된 창은 접근이 막힐 수 있다. 콜백 페이지의 자체 close에 맡긴다.
  }
}
