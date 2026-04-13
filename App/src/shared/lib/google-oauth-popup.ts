const GOOGLE_OAUTH_POPUP_NAME = "emailassist-google-oauth";
const GOOGLE_OAUTH_POPUP_FEATURES =
  "popup=yes,width=640,height=820,resizable=yes,scrollbars=yes";

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
  const popup = window.open("", GOOGLE_OAUTH_POPUP_NAME, GOOGLE_OAUTH_POPUP_FEATURES);

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
