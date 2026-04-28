const GOOGLE_OAUTH_POPUP_NAME = "emailassist-google-oauth";
const GOOGLE_OAUTH_POPUP_WIDTH = 640;
const GOOGLE_OAUTH_POPUP_HEIGHT = 820;

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

function renderLoadingState(popup: Window) {
  popup.document.title = "Google 인증을 준비하고 있습니다";
  popup.document.body.innerHTML = `
    <div style="font-family: system-ui, sans-serif; padding: 32px; color: #0f172a; line-height: 1.6;">
      <h1 style="font-size: 18px; margin: 0 0 12px;">Google 인증을 준비하고 있습니다</h1>
      <p style="margin: 0;">잠시 후 Google 로그인 화면으로 이동합니다.</p>
    </div>
  `;
}

export function openGoogleOAuthPopup() {
  const popup = window.open("", GOOGLE_OAUTH_POPUP_NAME, buildGoogleOAuthPopupFeatures());

  if (!popup) {
    return null;
  }

  renderLoadingState(popup);
  return popup;
}

export function navigateGoogleOAuthPopup(popup: Window, authorizationUrl: string) {
  popup.location.href = authorizationUrl;
  popup.focus();
}
