export const defaultSettingsState = {
  activeTab: "account",
  account: {
    name: "김호진",
    email: "user@gmail.com",
  },
  notifications: {
    newEmail: true,
    draftQueue: true,
    draftThreshold: 3,
    accountError: true,
    unclassified: false,
    calendarQueue: true,
    dailySummary: false,
    autoSendFailure: true,
  },
  display: {
    theme: "light",
    widgets: [
      { id: "upcoming", label: "다가오는 일정", visible: true },
      { id: "emails", label: "최근 수신 이메일", visible: true },
      { id: "summary", label: "이번 주 요약", visible: true },
    ],
  },
  emailAccounts: [
    {
      id: "gmail-primary",
      provider: "Gmail",
      email: "user@gmail.com",
      status: "정상 연결",
    },
  ],
};
